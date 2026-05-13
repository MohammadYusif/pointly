import { NotFoundError, PhoneNumber, Points, Transaction } from '../../domain';
import { ValidationError } from '../../domain/errors/DomainError';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import type { IIdempotencyService } from '../services/IIdempotencyService';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface GiftPointsRequest {
  senderId: string;
  recipientPhone: string;
  points: number;
  idempotencyKey: string;
  message?: string | undefined;
}

export interface GiftPointsResponse {
  senderBalanceAfter: number;
  recipientId: string;
  pointsGifted: number;
}

export class GiftPointsUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private transactionRepository: ITransactionRepository,
    private idempotencyService: IIdempotencyService,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  async execute(request: GiftPointsRequest): Promise<GiftPointsResponse> {
    // Idempotency check
    const scopedKey = `${request.senderId}:${request.idempotencyKey}`;
    const cached = await this.idempotencyService.getResult<GiftPointsResponse>(scopedKey);
    if (cached) return cached;

    if (request.points <= 0) {
      throw new ValidationError('Points to gift must be greater than zero');
    }

    const sender = await this.customerRepository.findById(request.senderId);
    if (!sender) {
      throw new NotFoundError('Customer', request.senderId);
    }

    const normalizedPhone = new PhoneNumber(request.recipientPhone).toE164();
    const recipient = await this.customerRepository.findByPhone(normalizedPhone);
    if (!recipient) {
      throw new NotFoundError('Customer', request.recipientPhone);
    }

    if (sender.getCustomerId() === recipient.getCustomerId()) {
      throw new ValidationError('Cannot gift points to yourself');
    }

    const pointsToGift = Points.from(request.points);

    // Capture balances BEFORE mutation for transaction records
    const senderBalanceBefore = sender.getGlobalPointsBalance();
    const recipientBalanceBefore = recipient.getGlobalPointsBalance();

    // Deduct from sender's global balance (validates sufficient balance internally)
    sender.redeemGlobalPoints(pointsToGift);

    // Award to recipient's global balance (not merchant-scoped)
    recipient.awardGlobalPoints(pointsToGift);

    // Sender debit transaction
    const senderTx = Transaction.createAdjustment(
      'POINTLY_NETWORK',
      sender.getCustomerId(),
      pointsToGift,
      senderBalanceBefore,
      false, // debit
      `${request.idempotencyKey}_sender`,
      {
        source: 'peer_gift_sent',
        recipientId: recipient.getCustomerId(),
        ...(request.message ? { message: request.message } : {}),
      },
    );
    senderTx.complete();

    // Recipient credit transaction
    const recipientTx = Transaction.createAdjustment(
      'POINTLY_NETWORK',
      recipient.getCustomerId(),
      pointsToGift,
      recipientBalanceBefore,
      true, // credit
      `${request.idempotencyKey}_recipient`,
      {
        source: 'peer_gift_received',
        senderId: sender.getCustomerId(),
        ...(request.message ? { message: request.message } : {}),
      },
    );
    recipientTx.complete();

    await this.atomicWrite([
      ...this.customerRepository.toPersistenceItem(sender),
      ...this.customerRepository.toPersistenceItem(recipient),
      ...this.transactionRepository.toPersistenceItem(senderTx),
      ...this.transactionRepository.toPersistenceItem(recipientTx),
    ]);

    const result: GiftPointsResponse = {
      senderBalanceAfter: sender.getGlobalPointsBalance().toNumber(),
      recipientId: recipient.getCustomerId(),
      pointsGifted: request.points,
    };

    await this.idempotencyService.storeResult(scopedKey, result, 86400);

    return result;
  }
}
