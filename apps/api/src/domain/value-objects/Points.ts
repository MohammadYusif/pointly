import { ValidationError } from "../errors/DomainError";

export class Points {
  private readonly value: number;

  constructor(points: number) {
    if (!Number.isInteger(points)) {
      throw new ValidationError("Points must be an integer");
    }

    if (points < 0) {
      throw new ValidationError("Points cannot be negative");
    }

    if (!Number.isFinite(points)) {
      throw new ValidationError("Points must be a finite number");
    }

    this.value = points;
  }

  toNumber(): number {
    return this.value;
  }

  add(other: Points): Points {
    return new Points(this.value + other.value);
  }

  subtract(other: Points): Points {
    const result = this.value - other.value;
    if (result < 0) {
      throw new ValidationError("Subtraction would result in negative points");
    }
    return new Points(result);
  }

  multiply(factor: number): Points {
    if (factor < 0) {
      throw new ValidationError("Factor cannot be negative");
    }
    return new Points(Math.floor(this.value * factor));
  }

  divide(divisor: number): Points {
    if (divisor <= 0) {
      throw new ValidationError("Divisor must be positive");
    }
    return new Points(Math.floor(this.value / divisor));
  }

  isGreaterThan(other: Points): boolean {
    return this.value > other.value;
  }

  isGreaterThanOrEqual(other: Points): boolean {
    return this.value >= other.value;
  }

  isLessThan(other: Points): boolean {
    return this.value < other.value;
  }

  isLessThanOrEqual(other: Points): boolean {
    return this.value <= other.value;
  }

  equals(other: Points): boolean {
    return this.value === other.value;
  }

  isZero(): boolean {
    return this.value === 0;
  }

  toString(): string {
    return this.value.toString();
  }

  toJSON(): number {
    return this.value;
  }

  static zero(): Points {
    return new Points(0);
  }

  static from(value: number): Points {
    return new Points(value);
  }
}
