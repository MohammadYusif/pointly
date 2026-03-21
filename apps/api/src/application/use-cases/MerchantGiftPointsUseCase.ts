import { NotFoundError, Points, Transaction } from '../../domain';
import { ValidationError } from '../../domain/errors/DomainError';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import type { IIdempotencyService } from '../services/IIdempotencyService';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface MerchantGiftPointsRequest {
  merchantId: string;
  customerId: string;
  points: number;
  idempotencyKey: string;
  note?: string | undefined;
}

export interface MerchantGiftPointsResponse {
  customerId: string;
  merchantPointsBalanceAfter: number;
  pointsGifted: number;
}

export class MerchantGiftPointsUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private transactionRepository: ITransactionRepository,
    private idempotencyService: IIdempotencyService,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  async execute(request: MerchantGiftPointsRequest): Promise<MerchantGiftPointsResponse> {
    // Idempotency check
    const cached = await this.idempotencyService.getResult<MerchantGiftPointsResponse>(
      request.idempotencyKey,
    );
    if (cached) return cached;

    if (request.points <= 0) {
      throw new ValidationError('Points to gift must be greater than zero');
    }

    const customer = await this.customerRepository.findById(request.customerId);
    if (!customer) {
      throw new NotFoundError('Customer', request.customerId);
    }

    const enrollment = customer.getEnrollment(request.merchantId);
    if (!enrollment) {
      throw new ValidationError('Customer is not enrolled with this merchant');
    }

    const pointsToGift = Points.from(request.points);
    const balanceBefore = customer.getMerchantPointsBalance(request.merchantId);

    // Award merchant-scoped points only — no global balance or tier change
    customer.awardMerchantPoints(request.merchantId, pointsToGift);

    // Adjustment transaction for audit trail
    const giftTx = Transaction.createAdjustment(
      request.merchantId,
      request.customerId,
      pointsToGift,
      balanceBefore,
      true, // credit
      request.idempotencyKey,
      {
        source: 'merchant_gift',
        ...(request.note ? { note: request.note } : {}),
      },
    );
    giftTx.complete();

    await this.atomicWrite([
      ...this.customerRepository.toPersistenceItem(customer),
      ...this.transactionRepository.toPersistenceItem(giftTx),
    ]);

    const result: MerchantGiftPointsResponse = {
      customerId: request.customerId,
      merchantPointsBalanceAfter: customer.getMerchantPointsBalance(request.merchantId).toNumber(),
      pointsGifted: request.points,
    };

    await this.idempotencyService.storeResult(request.idempotencyKey, result, 86400);

    return result;
  }
}
