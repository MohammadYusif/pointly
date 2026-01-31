import { ulid } from 'ulid';
import { ValidationError } from '../errors/DomainError';
import type { Money } from '../value-objects/Money';
import type { Points } from '../value-objects/Points';

export enum TransactionType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
  ADJUSTMENT = 'ADJUSTMENT',
  EXPIRATION = 'EXPIRATION',
  REVERSAL = 'REVERSAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export interface TransactionMetadata {
  receiptNumber?: string;
  cashierName?: string;
  terminalId?: string;
  notes?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface TransactionProps {
  transactionId: string;
  merchantId: string;
  customerId: string;
  type: TransactionType;
  status: TransactionStatus;
  points: Points;
  amount?: Money;
  balanceBefore: Points;
  balanceAfter: Points;
  metadata: TransactionMetadata;
  idempotencyKey: string;
  reversedTransactionId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class Transaction {
  private constructor(private props: TransactionProps) {}

  // Factory methods
  static createEarn(
    merchantId: string,
    customerId: string,
    points: Points,
    amount: Money,
    balanceBefore: Points,
    idempotencyKey: string,
    metadata: TransactionMetadata = {},
  ): Transaction {
    if (points.isZero()) {
      throw new ValidationError('Points must be greater than zero');
    }

    return new Transaction({
      transactionId: ulid(),
      merchantId,
      customerId,
      type: TransactionType.EARN,
      status: TransactionStatus.PENDING,
      points,
      amount,
      balanceBefore,
      balanceAfter: balanceBefore.add(points),
      metadata,
      idempotencyKey,
      createdAt: new Date(),
    });
  }

  static createRedeem(
    merchantId: string,
    customerId: string,
    points: Points,
    amount: Money,
    balanceBefore: Points,
    idempotencyKey: string,
    metadata: TransactionMetadata = {},
  ): Transaction {
    if (points.isZero()) {
      throw new ValidationError('Points must be greater than zero');
    }

    if (balanceBefore.isLessThan(points)) {
      throw new ValidationError('Insufficient points balance');
    }

    return new Transaction({
      transactionId: ulid(),
      merchantId,
      customerId,
      type: TransactionType.REDEEM,
      status: TransactionStatus.PENDING,
      points,
      amount,
      balanceBefore,
      balanceAfter: balanceBefore.subtract(points),
      metadata,
      idempotencyKey,
      createdAt: new Date(),
    });
  }

  static createAdjustment(
    merchantId: string,
    customerId: string,
    points: Points,
    balanceBefore: Points,
    isPositive: boolean,
    idempotencyKey: string,
    metadata: TransactionMetadata = {},
  ): Transaction {
    if (points.isZero()) {
      throw new ValidationError('Points must be greater than zero');
    }

    const balanceAfter = isPositive ? balanceBefore.add(points) : balanceBefore.subtract(points);

    return new Transaction({
      transactionId: ulid(),
      merchantId,
      customerId,
      type: TransactionType.ADJUSTMENT,
      status: TransactionStatus.PENDING,
      points,
      balanceBefore,
      balanceAfter,
      metadata,
      idempotencyKey,
      createdAt: new Date(),
    });
  }

  /**
   * Create an expiration transaction for decayed points
   */
  static createExpiration(
    merchantId: string, // Use "SYSTEM" for global decay
    customerId: string,
    points: Points,
    balanceBefore: Points,
    idempotencyKey: string,
    metadata: TransactionMetadata = {},
  ): Transaction {
    if (points.isZero()) {
      throw new ValidationError('Points must be greater than zero');
    }

    return new Transaction({
      transactionId: ulid(),
      merchantId,
      customerId,
      type: TransactionType.EXPIRATION,
      status: TransactionStatus.COMPLETED,
      points,
      balanceBefore,
      balanceAfter: balanceBefore.subtract(points),
      metadata: {
        ...metadata,
        expirationReason: metadata['reason'] || 'inactivity_decay',
        expirationDate: new Date().toISOString(),
      },
      idempotencyKey,
      createdAt: new Date(),
      completedAt: new Date(),
    });
  }

  static reconstitute(props: TransactionProps): Transaction {
    return new Transaction(props);
  }

  // Getters
  getTransactionId(): string {
    return this.props.transactionId;
  }

  getMerchantId(): string {
    return this.props.merchantId;
  }

  getCustomerId(): string {
    return this.props.customerId;
  }

  getType(): TransactionType {
    return this.props.type;
  }

  getStatus(): TransactionStatus {
    return this.props.status;
  }

  getPoints(): Points {
    return this.props.points;
  }

  getAmount(): Money | undefined {
    return this.props.amount;
  }

  getBalanceBefore(): Points {
    return this.props.balanceBefore;
  }

  getBalanceAfter(): Points {
    return this.props.balanceAfter;
  }

  getMetadata(): TransactionMetadata {
    return { ...this.props.metadata };
  }

  getIdempotencyKey(): string {
    return this.props.idempotencyKey;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getCompletedAt(): Date | undefined {
    return this.props.completedAt;
  }

  isReversed(): boolean {
    return this.props.status === TransactionStatus.REVERSED;
  }

  // Business methods
  complete(): void {
    if (this.props.status !== TransactionStatus.PENDING) {
      throw new ValidationError('Only pending transactions can be completed');
    }

    this.props.status = TransactionStatus.COMPLETED;
    this.props.completedAt = new Date();
  }

  fail(reason: string): void {
    if (this.props.status !== TransactionStatus.PENDING) {
      throw new ValidationError('Only pending transactions can be failed');
    }

    this.props.status = TransactionStatus.FAILED;
    this.props.metadata['failureReason'] = reason;
    this.props.completedAt = new Date();
  }

  reverse(): void {
    if (this.props.status !== TransactionStatus.COMPLETED) {
      throw new ValidationError('Only completed transactions can be reversed');
    }

    this.props.status = TransactionStatus.REVERSED;
  }

  createReversal(idempotencyKey: string): Transaction {
    if (this.props.status !== TransactionStatus.COMPLETED) {
      throw new ValidationError('Can only reverse completed transactions');
    }

    const reversalProps: TransactionProps = {
      transactionId: ulid(),
      merchantId: this.props.merchantId,
      customerId: this.props.customerId,
      type: TransactionType.REVERSAL,
      status: TransactionStatus.PENDING,
      points: this.props.points,
      balanceBefore: this.props.balanceAfter,
      balanceAfter: this.props.balanceBefore,
      metadata: {
        ...this.props.metadata,
        originalTransactionId: this.props.transactionId,
        reversalReason: 'Transaction reversed',
      },
      idempotencyKey,
      reversedTransactionId: this.props.transactionId,
      createdAt: new Date(),
    };

    if (this.props.amount) {
      reversalProps.amount = this.props.amount;
    }

    const reversal = new Transaction(reversalProps);

    this.reverse();
    return reversal;
  }

  // Serialization
  toJSON() {
    return {
      transactionId: this.props.transactionId,
      merchantId: this.props.merchantId,
      customerId: this.props.customerId,
      type: this.props.type,
      status: this.props.status,
      points: this.props.points.toNumber(),
      amount: this.props.amount?.toJSON(),
      balanceBefore: this.props.balanceBefore.toNumber(),
      balanceAfter: this.props.balanceAfter.toNumber(),
      metadata: this.props.metadata,
      idempotencyKey: this.props.idempotencyKey,
      reversedTransactionId: this.props.reversedTransactionId,
      createdAt: this.props.createdAt.toISOString(),
      completedAt: this.props.completedAt?.toISOString(),
    };
  }
}
