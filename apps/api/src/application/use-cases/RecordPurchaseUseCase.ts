import {
  CustomerTier,
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

    // Check enrollment
    const enrollment = customer.getEnrollment(request.merchantId);
    if (!enrollment) {
      throw new ValidationError('Customer is not enrolled with this merchant');
    }

    if (enrollment.consentStatus !== 'GRANTED') {
      throw new UnauthorizedError('Customer consent required to earn points');
    }

    // 4. Calculate dual points
    const amount = Money.fromSAR(request.amountSAR);
    const pointsCalculation = merchant.calculatePointsForPurchase(request.amountSAR);

    if (pointsCalculation.merchantPoints === 0) {
      throw new ValidationError(
        `Purchase amount ${request.amountSAR} SAR is below minimum purchase requirement`,
      );
    }

    const merchantPoints = Points.from(pointsCalculation.merchantPoints);
    const globalPoints = Points.from(pointsCalculation.globalPoints);

    // 5. Get current balances before transaction
    const merchantBalanceBefore = customer.getMerchantPointsBalance(request.merchantId);

    // 6. Create transaction record
    const transaction = Transaction.createEarn(
      request.merchantId,
      request.customerId,
      merchantPoints, // We track merchant points in the transaction
      amount,
      merchantBalanceBefore,
      request.idempotencyKey,
      request.metadata || {},
      locationId,
    );

    // 7. Award points to customer (both types)
    customer.addPointsFromPurchase(request.merchantId, globalPoints, merchantPoints);

    // 8. Update merchant stats
    merchant.incrementTransactionCount();

    // Mark transaction as completed
    transaction.complete();

    // 9. Save everything (repositories should handle transactional consistency)
    await this.transactionRepository.save(transaction);
    await this.customerRepository.save(customer);
    await this.merchantRepository.save(merchant);

    // 10. Store idempotency result
    const response: RecordPurchaseResponse = {
      transactionId: transaction.getTransactionId(),
      merchantPoints: merchantPoints.toNumber(),
      globalPoints: globalPoints.toNumber(),
      newMerchantBalance: customer.getMerchantPointsBalance(request.merchantId).toNumber(),
      newGlobalBalance: customer.getGlobalPointsBalance().toNumber(),

      // NEW - Tier info
      currentTier: customer.getCurrentTier().getDisplayName(),
      tierUpgrade: customer
        .getCurrentTier()
        .isHigherThan(
          CustomerTier.fromMonthlyProgress(
            customer.getMonthlyProgress().toNumber() - globalPoints.toNumber(),
          ),
        ),
      earningMultiplier: customer.getEarningMultiplier(),
      isDecayImmune: customer.isDecayImmune(),
      pointsToNextTier: customer.getPointsToNextTier(),

      message: `Purchase recorded! Earned ${merchantPoints.toNumber()} merchant points and ${globalPoints.toNumber()} Pointly Network points`,
    };

    await this.idempotencyService.storeResult(
      request.idempotencyKey,
      response,
      3600, // 1 hour TTL
    );

    return response;
  }
}
