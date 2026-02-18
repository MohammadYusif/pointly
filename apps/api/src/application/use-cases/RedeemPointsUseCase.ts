import {
  Money,
  NotFoundError,
  Points,
  Transaction,
  UnauthorizedError,
  ValidationError,
} from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import type { IIdempotencyService } from '../services/IIdempotencyService';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface RedeemPointsRequest {
  merchantId: string;
  customerId: string;
  pointsToRedeem: number;
  idempotencyKey: string;
  locationId?: string;
  metadata?: {
    receiptNumber?: string;
    cashierName?: string;
    terminalId?: string;
    notes?: string;
  };
}

export interface RedeemPointsResponse {
  transactionIds: string[];
  merchantPointsRedeemed: number;
  globalPointsRedeemed: number;
  totalPointsRedeemed: number;
  sarValue: number;
  newMerchantBalance: number;
  newGlobalBalance: number;
  currentTier: string;
  message: string;
}

/**
 * RedeemPointsUseCase - Process point redemption at a merchant
 *
 * Flow:
 * 1. Check idempotency (prevent duplicate redemptions)
 * 2. Validate merchant (exists, verified)
 * 3. Validate customer (exists, enrolled, has consent)
 * 4. Validate redemption amount (>= minimum, partial rules)
 * 5. Calculate SAR value
 * 6. Smart redeem: merchant points first, then global
 * 7. Create transaction record(s)
 * 8. Save everything
 * 9. Store idempotency result
 */
export class RedeemPointsUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private merchantRepository: IMerchantRepository,
    private transactionRepository: ITransactionRepository,
    private idempotencyService: IIdempotencyService,
    private atomicWrite?: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: redemption flow with validation, smart redeem, and dual transactions
  async execute(request: RedeemPointsRequest): Promise<RedeemPointsResponse> {
    // 1. Check idempotency
    const existingResult = await this.idempotencyService.getResult<RedeemPointsResponse>(
      request.idempotencyKey,
    );
    if (existingResult) {
      return existingResult;
    }

    // 2. Validate merchant
    const merchant = await this.merchantRepository.findById(request.merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', request.merchantId);
    }

    if (!merchant.isVerified()) {
      throw new UnauthorizedError('Merchant is not verified');
    }

    // 2b. Resolve locationId
    let locationId = request.locationId;
    const locations = merchant.getLocations();
    if (locationId) {
      const location = locations.find((l) => l.locationId === locationId && l.isActive);
      if (!location) {
        throw new ValidationError(`Location ${locationId} not found or inactive`);
      }
    } else if (locations.length === 1 && locations[0]) {
      locationId = locations[0].locationId;
    }

    // 3. Validate customer
    const customer = await this.customerRepository.findById(request.customerId);
    if (!customer) {
      throw new NotFoundError('Customer', request.customerId);
    }

    const enrollment = customer.getEnrollment(request.merchantId);
    if (!enrollment) {
      throw new ValidationError('Customer is not enrolled with this merchant');
    }

    if (enrollment.consentStatus !== 'GRANTED') {
      throw new UnauthorizedError('Customer consent required to redeem points');
    }

    // 4. Validate redemption amount
    const loyaltyConfig = merchant.getLoyaltyConfig();
    const pointsToRedeem = request.pointsToRedeem;

    if (pointsToRedeem < loyaltyConfig.minimumRedemption) {
      throw new ValidationError(`Minimum redemption is ${loyaltyConfig.minimumRedemption} points`);
    }

    if (!loyaltyConfig.allowPartialRedemption) {
      if (pointsToRedeem % loyaltyConfig.minimumRedemption !== 0) {
        throw new ValidationError(
          `Points must be an exact multiple of ${loyaltyConfig.minimumRedemption} (partial redemption not allowed)`,
        );
      }
    }

    // 5. Calculate SAR value
    const sarValue = pointsToRedeem * loyaltyConfig.redemptionRate;

    // 6. Smart redeem: merchant points first, then global
    const { merchantPointsUsed, globalPointsUsed } = customer.redeemSmart(
      request.merchantId,
      Points.from(pointsToRedeem),
    );

    // 7. Create transaction record(s)
    const transactionIds: string[] = [];
    const transactions: Transaction[] = [];
    const metadata = request.metadata || {};

    if (merchantPointsUsed.toNumber() > 0) {
      const merchantTx = Transaction.createRedeem(
        request.merchantId,
        request.customerId,
        merchantPointsUsed,
        Money.fromSAR(merchantPointsUsed.toNumber() * loyaltyConfig.redemptionRate),
        customer.getMerchantPointsBalance(request.merchantId).add(merchantPointsUsed),
        `${request.idempotencyKey}_MERCHANT`,
        { ...metadata, walletType: 'MERCHANT' },
        loyaltyConfig.redemptionRate,
        locationId,
      );
      merchantTx.complete();
      transactions.push(merchantTx);
      transactionIds.push(merchantTx.getTransactionId());
    }

    if (globalPointsUsed.toNumber() > 0) {
      const globalTx = Transaction.createRedeem(
        request.merchantId,
        request.customerId,
        globalPointsUsed,
        Money.fromSAR(globalPointsUsed.toNumber() * loyaltyConfig.redemptionRate),
        customer.getGlobalPointsBalance().add(globalPointsUsed),
        `${request.idempotencyKey}_GLOBAL`,
        { ...metadata, walletType: 'GLOBAL' },
        loyaltyConfig.redemptionRate,
        locationId,
      );
      globalTx.complete();
      transactions.push(globalTx);
      transactionIds.push(globalTx.getTransactionId());
    }

    // 8. Save everything atomically (or fall back to sequential saves)
    merchant.incrementTransactionCount();

    if (this.atomicWrite) {
      const items: PersistenceItem[] = [
        ...transactions.flatMap((tx) => this.transactionRepository.toPersistenceItem(tx)),
        ...this.customerRepository.toPersistenceItem(customer),
        ...this.merchantRepository.toPersistenceItem(merchant),
      ];
      await this.atomicWrite(items);
    } else {
      for (const tx of transactions) {
        await this.transactionRepository.save(tx);
      }
      await this.customerRepository.save(customer);
      await this.merchantRepository.save(merchant);
    }

    // 9. Store idempotency result and return
    const response: RedeemPointsResponse = {
      transactionIds,
      merchantPointsRedeemed: merchantPointsUsed.toNumber(),
      globalPointsRedeemed: globalPointsUsed.toNumber(),
      totalPointsRedeemed: pointsToRedeem,
      sarValue,
      newMerchantBalance: customer.getMerchantPointsBalance(request.merchantId).toNumber(),
      newGlobalBalance: customer.getGlobalPointsBalance().toNumber(),
      currentTier: customer.getCurrentTier().getDisplayName(),
      message: `Redeemed ${pointsToRedeem} points for ${sarValue.toFixed(2)} SAR`,
    };

    await this.idempotencyService.storeResult(request.idempotencyKey, response, 3600);

    return response;
  }
}
