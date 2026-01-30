import { ValidationError } from "../errors/DomainError";

export class Email {
  private readonly value: string;

  constructor(email: string) {
    this.value = Email.validate(email);
  }

  private static validate(email: string): string {
    const trimmed = email.trim().toLowerCase();

    // Basic email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmed)) {
      throw new ValidationError("Invalid email format");
    }

    // Additional validations
    if (trimmed.length > 254) {
      throw new ValidationError("Email too long");
    }

    const parts = trimmed.split("@");
    const localPart = parts[0];
    const domain = parts[1];

    if (!localPart || !domain) {
      throw new ValidationError("Invalid email format");
    }

    if (localPart.length > 64) {
      throw new ValidationError("Email local part too long");
    }

    if (domain.length > 253) {
      throw new ValidationError("Email domain too long");
    }

    return trimmed;
  }

  toString(): string {
    return this.value;
  }

  getDomain(): string {
    const parts = this.value.split("@");
    // Safe because we validated in constructor
    return parts[1]!;
  }

  getLocalPart(): string {
    const parts = this.value.split("@");
    // Safe because we validated in constructor
    return parts[0]!;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
