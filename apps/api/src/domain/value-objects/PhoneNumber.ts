import { ValidationError } from '../errors/DomainError';

export class PhoneNumber {
  private readonly value: string;

  constructor(phone: string) {
    this.value = PhoneNumber.validate(phone);
  }

  private static validate(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Saudi Arabia phone number validation
    // Format: +966XXXXXXXXX (9 digits after country code)
    // Mobile prefixes: 50, 51, 52, 53, 54, 55, 56, 57, 58, 59

    // Handle different input formats
    let normalized = cleaned;

    if (cleaned.startsWith('966')) {
      // Already has country code
      normalized = cleaned;
    } else if (cleaned.startsWith('0')) {
      // Local format (0XXXXXXXXX)
      normalized = `966${cleaned.substring(1)}`;
    } else if (cleaned.length === 9) {
      // Just the 9 digits
      normalized = `966${cleaned}`;
    } else {
      throw new ValidationError('Invalid phone number format');
    }

    // Validate length (12 digits total: 966 + 9 digits)
    if (normalized.length !== 12) {
      throw new ValidationError('Invalid phone number length');
    }

    // Validate country code
    if (!normalized.startsWith('966')) {
      throw new ValidationError('Only Saudi Arabia phone numbers are supported');
    }

    // Validate mobile prefix (5X)
    const prefix = normalized.substring(3, 4);
    if (prefix !== '5') {
      throw new ValidationError('Invalid mobile number prefix');
    }

    return normalized;
  }

  toString(): string {
    return this.value;
  }

  toE164(): string {
    return `+${this.value}`;
  }

  toLocal(): string {
    // Convert to local format: 0XXXXXXXXX
    return `0${this.value.substring(3)}`;
  }

  toDisplay(): string {
    // Format: +966 XX XXX XXXX
    const country = this.value.substring(0, 3);
    const part1 = this.value.substring(3, 5);
    const part2 = this.value.substring(5, 8);
    const part3 = this.value.substring(8, 12);
    return `+${country} ${part1} ${part2} ${part3}`;
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  static fromE164(e164: string): PhoneNumber {
    return new PhoneNumber(e164);
  }

  static fromLocal(local: string): PhoneNumber {
    return new PhoneNumber(local);
  }
}
