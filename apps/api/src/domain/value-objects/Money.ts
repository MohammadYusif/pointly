import { ValidationError } from '../errors/DomainError';

export class Money {
  private readonly amount: number; // Store in halalas (smallest unit, 1 SAR = 100 halalas)
  private readonly currency = 'SAR' as const;

  constructor(amount: number, unit: 'SAR' | 'halalas' = 'SAR') {
    if (unit === 'SAR') {
      this.amount = Math.round(amount * 100); // Convert to halalas
    } else {
      this.amount = Math.round(amount);
    }

    if (this.amount < 0) {
      throw new ValidationError('Amount cannot be negative');
    }

    if (!Number.isFinite(this.amount)) {
      throw new ValidationError('Amount must be a finite number');
    }
  }

  toSAR(): number {
    return this.amount / 100;
  }

  toHalalas(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount, 'halalas');
  }

  subtract(other: Money): Money {
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new ValidationError('Subtraction would result in negative amount');
    }
    return new Money(result, 'halalas');
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new ValidationError('Factor cannot be negative');
    }
    return new Money(this.amount * factor, 'halalas');
  }

  divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new ValidationError('Divisor must be positive');
    }
    return new Money(this.amount / divisor, 'halalas');
  }

  isGreaterThan(other: Money): boolean {
    return this.amount > other.amount;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.amount >= other.amount;
  }

  isLessThan(other: Money): boolean {
    return this.amount < other.amount;
  }

  isLessThanOrEqual(other: Money): boolean {
    return this.amount <= other.amount;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  toString(): string {
    return `${this.toSAR().toFixed(2)} ${this.currency}`;
  }

  toJSON() {
    return {
      amount: this.toSAR(),
      currency: this.currency,
    };
  }

  static fromSAR(amount: number): Money {
    return new Money(amount, 'SAR');
  }

  static fromHalalas(amount: number): Money {
    return new Money(amount, 'halalas');
  }

  static zero(): Money {
    return new Money(0, 'halalas');
  }
}
