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
import type { LoyaltyConfiguration } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import type { IWebhookConfigRepository } from '../repositories/IWebhookConfigRepository';
import type { IIdempotencyService } from '../services/IIdempotencyService';
import type { IOutgoingWebhookService } from '../services/IOutgoingWebhookService';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

const IDEMPOTENCY_TTL_SECONDS = 3600;

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
 * 6. Validate sufficient merchant points (global points are NOT spendable)
 * 7. Redeem from merchant wallet only
 * 8. Create transaction record
 * 9. Save everything
 * 10. Store idempotency result
 */
export class RedeemPointsUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private merchantRepository: IMerchantRepository,
    private transactionRepository: ITransactionRepository,
    private idempotencyService: IIdempotencyService,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
    private webhookConfigRepository?: IWebhookConfigRepository,
    private outgoingWebhookService?: IOutgoingWebhookService,
  ) {}

  async execute(request: RedeemPointsRequest): Promise<RedeemPointsResponse> {
    // 1. Check idempotency
    const scopedKey = `${request.merchantId}:${request.idempotencyKey}`;
    const existingResult = await this.idempotencyService.getResult<RedeemPointsResponse>(scopedKey);
    if (existingResult) {
      return existingResult;
    }

    // 2. Validate merchant
    const { merchant, resolvedLocationId } = await this.validateMerchant(
      request.merchantId,
      request.locationId,
    );

    // 3. Validate customer
    const customer = await this.validateCustomerAndEnrollment(
      request.customerId,
      request.merchantId,
    );

    // 4. Validate redemption amount
    const loyaltyConfig = merchant.getLoyaltyConfig();
    this.validateRedemptionAmount(request.pointsToRedeem, loyaltyConfig);

    // 5. Calculate SAR value
    const sarValue = request.pointsToRedeem * loyaltyConfig.redemptionRate;

    // 6. Validate sufficient merchant points (global points are for tier maintenance only)
    const pointsToRedeem = Points.from(request.pointsToRedeem);
    const merchantBalance = customer.getMerchantPointsBalance(request.merchantId);
    if (merchantBalance.isLessThan(pointsToRedeem)) {
      throw new ValidationError(
        `Insufficient merchant points. Available: ${merchantBalance.toNumber()}, Requested: ${request.pointsToRedeem}`,
      );
    }

    // 7. Redeem from merchant wallet only
    customer.redeemMerchantPoints(request.merchantId, pointsToRedeem);

    // 8. Create transaction record
    const metadata = request.metadata || {};
    const tx = Transaction.createRedeem(
      request.merchantId,
      request.customerId,
      pointsToRedeem,
      Money.fromSAR(request.pointsToRedeem * loyaltyConfig.redemptionRate),
      merchantBalance,
      request.idempotencyKey,
      { ...metadata, walletType: 'MERCHANT' },
      loyaltyConfig.redemptionRate,
      resolvedLocationId,
    );
    tx.complete();

    // 9. Save everything atomically
    merchant.incrementTransactionCount();

    const items: PersistenceItem[] = [
      ...this.transactionRepository.toPersistenceItem(tx),
      ...this.customerRepository.toPersistenceItem(customer),
      ...this.merchantRepository.toPersistenceItem(merchant),
    ];
    await this.atomicWrite(items);

    // 10. Store idempotency result and return
    const transactionIds = [tx.getTransactionId()];
    const response: RedeemPointsResponse = {
      transactionIds,
      merchantPointsRedeemed: request.pointsToRedeem,
      globalPointsRedeemed: 0,
      totalPointsRedeemed: request.pointsToRedeem,
      sarValue,
      newMerchantBalance: customer.getMerchantPointsBalance(request.merchantId).toNumber(),
      newGlobalBalance: customer.getGlobalPointsBalance().toNumber(),
      currentTier: customer.getCurrentTier().getDisplayName(),
      message: `Redeemed ${request.pointsToRedeem} points for ${sarValue.toFixed(2)} SAR`,
    };

    await this.idempotencyService.storeResult(scopedKey, response, IDEMPOTENCY_TTL_SECONDS);

    if (this.webhookConfigRepository && this.outgoingWebhookService) {
      const webhookConfigRepo = this.webhookConfigRepository;
      const webhookService = this.outgoingWebhookService;
      webhookConfigRepo
        .findByMerchant(request.merchantId)
        .then((configs) => {
          for (const config of configs) {
            if (config.supportsEvent('REDEMPTION')) {
              webhookService.send(config, 'REDEMPTION', {
                customerId: request.customerId,
                merchantId: request.merchantId,
                pointsRedeemed: request.pointsToRedeem,
                sarValue,
                transactionIds,
                timestamp: new Date().toISOString(),
              });
            }
          }
        })
        .catch(() => {});
    }

    return response;
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

  private async validateCustomerAndEnrollment(
    customerId: string,
    merchantId: string,
  ): Promise<Customer> {
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

  private validateRedemptionAmount(
    pointsToRedeem: number,
    loyaltyConfig: LoyaltyConfiguration,
  ): void {
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
  }
}
