import {
  type Customer,
  type Merchant,
  Money,
  NotFoundError,
  Points,
  Transaction,
  UnauthorizedError,
  ValidationError,
} from '../../domain';
import type { TransactionMetadata } from '../../domain';
import type { CampaignEligibilityContext } from '../../domain/entities/Campaign';
import type { ICampaignRepository } from '../repositories/ICampaignRepository';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import type { IIdempotencyService } from '../services/IIdempotencyService';
import type { ISmsPublisherService } from '../services/ISmsPublisherService';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';
import type { CheckChallengeEligibilityUseCase } from './CheckChallengeEligibilityUseCase';

const IDEMPOTENCY_TTL_SECONDS = 3600;

export interface RecordPurchaseRequest {
  merchantId: string;
  customerId: string;
  amountSAR: number;
  idempotencyKey: string;
  locationId?: string;
  metadata?: {
    receiptNumber?: string;
    cashierName?: string;
    terminalId?: string;
    notes?: string;
  };
}

export interface PurchaseBreakdown {
  purchaseAmount: number;
  pointsPerSAR: number;
  basePoints: number;
  tierMultiplier: number;
  tierName: string;
  campaignName?: string;
  campaignMultiplier?: number;
  bonusPointsCap?: number;
  bonusPointsBeforeCap?: number;
  finalMerchantPoints: number;
  finalGlobalPoints: number;
}

export interface RecordPurchaseResponse {
  transactionId: string;
  merchantPoints: number;
  globalPoints: number;
  newMerchantBalance: number;
  newGlobalBalance: number;

  // NEW - Tier info
  currentTier: string;
  tierUpgrade: boolean;
  earningMultiplier: number;
  isDecayImmune: boolean;
  pointsToNextTier: number;

  campaignMultiplier?: number;
  campaignName?: string;

  breakdown: PurchaseBreakdown;

  message: string;
}

/**
 * RecordPurchaseUseCase - Core transaction flow
 *
 * Flow:
 * 1. Check idempotency (prevent duplicate transactions)
 * 2. Validate merchant (exists, verified, has quota)
 * 3. Validate customer (exists, enrolled, has consent)
 * 4. Calculate dual points (merchant + global)
 * 5. Create transaction record
 * 6. Award points to customer
 * 7. Update merchant stats
 * 8. Save everything atomically
 */
export class RecordPurchaseUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private merchantRepository: IMerchantRepository,
    private transactionRepository: ITransactionRepository,
    private idempotencyService: IIdempotencyService,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
    private smsPublisher?: ISmsPublisherService,
    private campaignRepository?: ICampaignRepository,
    private checkChallengeEligibility?: CheckChallengeEligibilityUseCase,
  ) {}

  async execute(request: RecordPurchaseRequest): Promise<RecordPurchaseResponse> {
    // 1. Check idempotency - prevent duplicate transactions
    const existingResult = await this.idempotencyService.getResult<RecordPurchaseResponse>(
      request.idempotencyKey,
    );
    if (existingResult) {
      return existingResult;
    }

    // 2. Validate merchant
    const { merchant, resolvedLocationId } = await this.validateMerchant(
      request.merchantId,
      request.locationId,
    );

    // 3. Validate customer
    const customer = await this.validateCustomer(request.customerId, request.merchantId);

    // 4. Calculate dual points
    const amount = Money.fromSAR(request.amountSAR);
    const pointsCalculation = merchant.calculatePointsForPurchase(request.amountSAR);

    if (pointsCalculation.merchantPoints === 0) {
      throw new ValidationError(
        `Purchase amount ${request.amountSAR} SAR is below minimum purchase requirement`,
      );
    }

    let merchantPoints = Points.from(pointsCalculation.merchantPoints);
    const globalPoints = Points.from(pointsCalculation.globalPoints);

    // 4b. Apply active campaign multiplier if available
    let activeCampaignMultiplier: number | undefined;
    let activeCampaignName: string | undefined;
    let activeCampaignId: string | undefined;
    let activeCampaignBonusCap: number | undefined;
    let activeCampaignBonusBeforeCap: number | undefined;
    const campaignResult = await this.resolveBestCampaign(request, customer, merchantPoints);
    if (campaignResult) {
      activeCampaignId = campaignResult.id;
      activeCampaignMultiplier = campaignResult.multiplier;
      activeCampaignName = campaignResult.name;
      activeCampaignBonusCap = campaignResult.bonusPointsCap;
      activeCampaignBonusBeforeCap = campaignResult.bonusPointsBeforeCap;
      // Campaign only affects merchant points — global points are never touched by campaigns
      merchantPoints = campaignResult.merchantPoints;
    }

    // 5. Get current balances before transaction
    const merchantBalanceBefore = customer.getMerchantPointsBalance(request.merchantId);
    const globalBalanceBefore = customer.getGlobalPointsBalance();

    // 5b. Capture tier before awarding points (for upgrade detection)
    const tierBefore = customer.getCurrentTier();

    // 5c. Award points to customer — entity applies tier multiplier to global points
    // Campaign only affects merchantPoints; global points get the normal tier boost
    const { boostedGlobalPoints } = customer.addPointsFromPurchase(
      request.merchantId,
      globalPoints,
      merchantPoints,
    );

    // 6. Create merchant transaction record (include campaign metadata if active)
    const baseMetadata: TransactionMetadata = request.metadata || {};

    // Build points calculation breakdown
    const loyaltyConfig = merchant.getLoyaltyConfig();
    const breakdown = {
      purchaseAmount: request.amountSAR,
      pointsPerSAR: loyaltyConfig.pointsPerSAR,
      basePoints: pointsCalculation.merchantPoints,
      tierMultiplier: customer.getEarningMultiplier(),
      tierName: customer.getCurrentTier().getDisplayName(),
      ...(activeCampaignName !== undefined && { campaignName: activeCampaignName }),
      ...(activeCampaignMultiplier !== undefined && {
        campaignMultiplier: activeCampaignMultiplier,
      }),
      ...(activeCampaignBonusCap !== undefined && { bonusPointsCap: activeCampaignBonusCap }),
      ...(activeCampaignBonusBeforeCap !== undefined && {
        bonusPointsBeforeCap: activeCampaignBonusBeforeCap,
      }),
      finalMerchantPoints: merchantPoints.toNumber(),
      finalGlobalPoints: boostedGlobalPoints.toNumber(),
    };

    const txMetadata: TransactionMetadata = {
      ...baseMetadata,
      breakdown: JSON.stringify(breakdown),
      ...(activeCampaignName
        ? {
            campaignId: activeCampaignId ?? '',
            campaignName: activeCampaignName,
            campaignMultiplier: activeCampaignMultiplier ?? 1,
          }
        : {}),
    };

    const transaction = Transaction.createEarn(
      request.merchantId,
      request.customerId,
      merchantPoints,
      amount,
      merchantBalanceBefore,
      request.idempotencyKey,
      txMetadata,
      resolvedLocationId,
    );

    // 6b. Create global points audit trail
    const globalTransaction = this.createAuditTrail(
      request.merchantId,
      request.customerId,
      boostedGlobalPoints,
      amount,
      globalBalanceBefore,
      request.idempotencyKey,
      txMetadata,
      resolvedLocationId,
    );

    // 8. Update merchant stats
    merchant.incrementTransactionCount();

    // Mark transactions as completed
    transaction.complete();
    globalTransaction.complete();

    // 9. Save everything atomically
    await this.atomicWrite([
      ...this.transactionRepository.toPersistenceItem(transaction),
      ...this.transactionRepository.toPersistenceItem(globalTransaction),
      ...this.customerRepository.toPersistenceItem(customer),
      ...this.merchantRepository.toPersistenceItem(merchant),
    ]);

    // 10. Store idempotency result
    const response: RecordPurchaseResponse = {
      transactionId: transaction.getTransactionId(),
      merchantPoints: merchantPoints.toNumber(),
      globalPoints: boostedGlobalPoints.toNumber(),
      newMerchantBalance: customer.getMerchantPointsBalance(request.merchantId).toNumber(),
      newGlobalBalance: customer.getGlobalPointsBalance().toNumber(),

      // Tier info
      currentTier: customer.getCurrentTier().getDisplayName(),
      tierUpgrade: customer.getCurrentTier().isHigherThan(tierBefore),
      earningMultiplier: customer.getEarningMultiplier(),
      isDecayImmune: customer.isDecayImmune(),
      pointsToNextTier: customer.getPointsToNextTier(),

      ...(activeCampaignMultiplier !== undefined && {
        campaignMultiplier: activeCampaignMultiplier,
      }),
      ...(activeCampaignName !== undefined && { campaignName: activeCampaignName }),

      breakdown,

      message: `Purchase recorded! Earned ${merchantPoints.toNumber()} merchant points and ${boostedGlobalPoints.toNumber()} Pointly Network points`,
    };

    await this.idempotencyService.storeResult(
      request.idempotencyKey,
      response,
      IDEMPOTENCY_TTL_SECONDS,
    );

    // 11. Fire-and-forget SMS notification
    if (this.smsPublisher) {
      const customerPhone = customer.getPhone().toE164();
      this.smsPublisher.publish({
        phone: customerPhone,
        body: `You earned ${merchantPoints.toNumber()} merchant + ${boostedGlobalPoints.toNumber()} network points at ${merchant.getBusinessName()}! Balance: ${response.newMerchantBalance}`,
        merchantId: request.merchantId,
        type: 'POINTS_EARNED',
      });
    }

    // 12. Fire-and-forget challenge eligibility check
    if (this.checkChallengeEligibility) {
      this.checkChallengeEligibility
        .execute({ customerId: request.customerId, merchantId: request.merchantId })
        .catch(() => {});
    }

    return response;
  }

  private async resolveBestCampaign(
    request: RecordPurchaseRequest,
    customer: Customer,
    baseMerchantPoints: Points,
  ): Promise<{
    id: string;
    multiplier: number;
    name: string;
    merchantPoints: Points;
    bonusPointsCap?: number;
    bonusPointsBeforeCap?: number;
  } | null> {
    if (!this.campaignRepository) return null;
    const activeCampaigns = await this.campaignRepository.findActiveCampaignsForMerchant(
      request.merchantId,
    );
    if (activeCampaigns.length === 0) return null;

    const enrollment = customer.getEnrollment(request.merchantId);
    if (!enrollment) return null;

    const ctx: CampaignEligibilityContext = {
      enrolledAt: enrollment.enrolledAt,
      customerTier: customer.getCurrentTier().getLevel(),
    };
    const dob = customer.toJSON().dateOfBirth;
    if (dob) ctx.dateOfBirth = dob;
    if (enrollment.lastTransactionAt) ctx.lastTransactionAt = enrollment.lastTransactionAt;

    const useCounts = await this.getCampaignUseCounts(request.customerId, request.merchantId);

    const eligible = activeCampaigns.filter(
      (c) =>
        c.isEligibleForCustomer(ctx) &&
        c.meetsMinPurchase(request.amountSAR) &&
        c.isWithinUsageLimit(useCounts.get(c.getCampaignId()) ?? 0),
    );
    eligible.sort((a, b) => b.getMultiplier() - a.getMultiplier());
    const campaign = eligible[0];
    if (!campaign) return null;

    const mult = campaign.getMultiplier();
    const baseMerchant = baseMerchantPoints.toNumber();
    let campaignMerchant = Math.floor(baseMerchant * mult);

    // Cap bonus points if campaign has a per-transaction cap
    const merchantBonus = campaignMerchant - baseMerchant;
    const cappedBonus = campaign.capBonusPoints(merchantBonus);
    let bonusPointsCap: number | undefined;
    let bonusPointsBeforeCap: number | undefined;
    if (cappedBonus < merchantBonus && merchantBonus > 0) {
      campaignMerchant = baseMerchant + cappedBonus;
      bonusPointsCap = cappedBonus;
      bonusPointsBeforeCap = merchantBonus;
    }

    return {
      id: campaign.getCampaignId(),
      multiplier: mult,
      name: campaign.getName(),
      merchantPoints: Points.from(campaignMerchant),
      ...(bonusPointsCap !== undefined && { bonusPointsCap }),
      ...(bonusPointsBeforeCap !== undefined && { bonusPointsBeforeCap }),
    };
  }

  private async getCampaignUseCounts(
    customerId: string,
    merchantId: string,
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    let nextToken: string | undefined;
    do {
      const opts = nextToken ? { limit: 200, nextToken } : { limit: 200 };
      const result = await this.transactionRepository.findByCustomerAndMerchant(
        customerId,
        merchantId,
        opts,
      );
      for (const tx of result.items) {
        const meta = tx.getMetadata();
        // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature requires bracket notation
        const cId = meta['campaignId'];
        if (typeof cId === 'string') {
          counts.set(cId, (counts.get(cId) ?? 0) + 1);
        }
      }
      nextToken = result.nextToken;
    } while (nextToken);
    return counts;
  }

  private async validateMerchant(
    merchantId: string,
    locationId?: string,
  ): Promise<{ merchant: Merchant; resolvedLocationId: string | undefined }> {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', merchantId);
    }

    if (!merchant.isVerified()) {
      throw new UnauthorizedError('Merchant is not verified');
    }

    let resolvedLocationId = locationId;
    const locations = merchant.getLocations();
    if (locationId) {
      const location = locations.find((l) => l.locationId === locationId && l.isActive);
      if (!location) {
        throw new ValidationError(`Location ${locationId} not found or inactive`);
      }
    } else if (locations.length === 1 && locations[0]) {
      resolvedLocationId = locations[0].locationId;
    }

    return { merchant, resolvedLocationId };
  }

  private async validateCustomer(customerId: string, merchantId: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError('Customer', customerId);
    }

    const enrollment = customer.getEnrollment(merchantId);
    if (!enrollment) {
      throw new ValidationError('Customer is not enrolled with this merchant');
    }

    return customer;
  }

  private createAuditTrail(
    merchantId: string,
    customerId: string,
    boostedGlobalPoints: Points,
    amount: Money,
    globalBalanceBefore: Points,
    idempotencyKey: string,
    metadata: TransactionMetadata,
    locationId?: string,
  ): Transaction {
    return Transaction.createEarn(
      'POINTLY_NETWORK',
      customerId,
      boostedGlobalPoints,
      amount,
      globalBalanceBefore,
      `${idempotencyKey}_global`,
      {
        ...metadata,
        source: 'purchase',
        sourceMerchantId: merchantId,
      },
      locationId,
    );
  }
}
