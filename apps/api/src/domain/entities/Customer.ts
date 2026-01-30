import { ulid } from "ulid";
import { PhoneNumber } from "../value-objects/PhoneNumber";
import { Points } from "../value-objects/Points";
import { ValidationError } from "../errors/DomainError";

export enum CustomerStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

export enum ConsentStatus {
  PENDING = "PENDING",
  GRANTED = "GRANTED",
  REVOKED = "REVOKED",
}

export interface CustomerEnrollment {
  merchantId: string;
  enrolledAt: Date;
  consentStatus: ConsentStatus;
  consentGrantedAt?: Date;
  merchantPointsBalance: Points;
  merchantLifetimePoints: Points;
  transactionCount: number;
  lastTransactionAt?: Date;
}

export interface CustomerProps {
  customerId: string;
  phone: PhoneNumber;
  name?: string;
  status: CustomerStatus;
  globalPointsBalance: Points;
  globalLifetimePoints: Points;
  enrollments: Map<string, CustomerEnrollment>;
  createdAt: Date;
  updatedAt: Date;
}

export class Customer {
  private constructor(private props: CustomerProps) {}

  // Factory methods
  static create(phone: PhoneNumber, name?: string): Customer {
    const props: CustomerProps = {
      customerId: ulid(),
      phone,
      status: CustomerStatus.ACTIVE,
      globalPointsBalance: Points.zero(),
      globalLifetimePoints: Points.zero(),
      enrollments: new Map(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (name) {
      props.name = name;
    }

    return new Customer(props);
  }

  static reconstitute(props: CustomerProps): Customer {
    return new Customer(props);
  }

  // Getters
  getCustomerId(): string {
    return this.props.customerId;
  }

  getPhone(): PhoneNumber {
    return this.props.phone;
  }

  getName(): string | undefined {
    return this.props.name;
  }

  getStatus(): CustomerStatus {
    return this.props.status;
  }

  getGlobalPointsBalance(): Points {
    return this.props.globalPointsBalance;
  }

  getGlobalLifetimePoints(): Points {
    return this.props.globalLifetimePoints;
  }

  getEnrollments(): Map<string, CustomerEnrollment> {
    return new Map(this.props.enrollments);
  }

  getEnrollment(merchantId: string): CustomerEnrollment | undefined {
    return this.props.enrollments.get(merchantId);
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business methods
  enrollWithMerchant(merchantId: string): void {
    if (this.props.status !== CustomerStatus.ACTIVE) {
      throw new ValidationError("Customer must be active to enroll");
    }

    if (this.props.enrollments.has(merchantId)) {
      throw new ValidationError("Customer already enrolled with this merchant");
    }

    const enrollment: CustomerEnrollment = {
      merchantId,
      enrolledAt: new Date(),
      consentStatus: ConsentStatus.PENDING,
      merchantPointsBalance: Points.zero(),
      merchantLifetimePoints: Points.zero(),
      transactionCount: 0,
    };

    this.props.enrollments.set(merchantId, enrollment);
    this.props.updatedAt = new Date();
  }

  grantConsent(merchantId: string): void {
    const enrollment = this.props.enrollments.get(merchantId);
    if (!enrollment) {
      throw new ValidationError("Customer not enrolled with this merchant");
    }

    if (enrollment.consentStatus === ConsentStatus.GRANTED) {
      throw new ValidationError("Consent already granted");
    }

    enrollment.consentStatus = ConsentStatus.GRANTED;
    enrollment.consentGrantedAt = new Date();
    this.props.updatedAt = new Date();
  }

  revokeConsent(merchantId: string): void {
    const enrollment = this.props.enrollments.get(merchantId);
    if (!enrollment) {
      throw new ValidationError("Customer not enrolled with this merchant");
    }

    enrollment.consentStatus = ConsentStatus.REVOKED;
    this.props.updatedAt = new Date();
  }

  /**
   * Add points from a purchase - awards both global (Pointly Network) and merchant-specific points
   */
  addPointsFromPurchase(
    merchantId: string,
    globalPoints: Points,
    merchantPoints: Points,
  ): void {
    const enrollment = this.props.enrollments.get(merchantId);
    if (!enrollment) {
      throw new ValidationError("Customer not enrolled with this merchant");
    }

    if (enrollment.consentStatus !== ConsentStatus.GRANTED) {
      throw new ValidationError("Consent required to add points");
    }

    // Add global points (Pointly Network)
    this.props.globalPointsBalance =
      this.props.globalPointsBalance.add(globalPoints);
    this.props.globalLifetimePoints =
      this.props.globalLifetimePoints.add(globalPoints);

    // Add merchant-specific points
    enrollment.merchantPointsBalance =
      enrollment.merchantPointsBalance.add(merchantPoints);
    enrollment.merchantLifetimePoints =
      enrollment.merchantLifetimePoints.add(merchantPoints);

    enrollment.transactionCount++;
    enrollment.lastTransactionAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Redeem global Pointly Network points (usable at any merchant)
   */
  redeemGlobalPoints(points: Points): void {
    if (this.props.status !== CustomerStatus.ACTIVE) {
      throw new ValidationError("Customer must be active to redeem points");
    }

    if (this.props.globalPointsBalance.isLessThan(points)) {
      throw new ValidationError("Insufficient global points balance");
    }

    this.props.globalPointsBalance =
      this.props.globalPointsBalance.subtract(points);
    this.props.updatedAt = new Date();
  }

  /**
   * Redeem merchant-specific points (only at that merchant)
   */
  redeemMerchantPoints(merchantId: string, points: Points): void {
    const enrollment = this.props.enrollments.get(merchantId);
    if (!enrollment) {
      throw new ValidationError("Customer not enrolled with this merchant");
    }

    if (enrollment.consentStatus !== ConsentStatus.GRANTED) {
      throw new ValidationError("Consent required to redeem points");
    }

    if (enrollment.merchantPointsBalance.isLessThan(points)) {
      throw new ValidationError("Insufficient merchant points balance");
    }

    enrollment.merchantPointsBalance =
      enrollment.merchantPointsBalance.subtract(points);
    enrollment.transactionCount++;
    enrollment.lastTransactionAt = new Date();
    this.props.updatedAt = new Date();
  }

  getMerchantPointsBalance(merchantId: string): Points {
    const enrollment = this.props.enrollments.get(merchantId);
    if (!enrollment) {
      return Points.zero();
    }
    return enrollment.merchantPointsBalance;
  }

  updateName(name: string): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  suspend(): void {
    this.props.status = CustomerStatus.SUSPENDED;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.status = CustomerStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.status = CustomerStatus.INACTIVE;
    this.props.updatedAt = new Date();
  }

  // Serialization
  toJSON() {
    return {
      customerId: this.props.customerId,
      phone: this.props.phone.toString(),
      name: this.props.name,
      status: this.props.status,
      globalPointsBalance: this.props.globalPointsBalance.toNumber(),
      globalLifetimePoints: this.props.globalLifetimePoints.toNumber(),
      enrollments: Array.from(this.props.enrollments.entries()).map(
        ([, enrollment]) => ({
          ...enrollment,
          merchantPointsBalance: enrollment.merchantPointsBalance.toNumber(),
          merchantLifetimePoints: enrollment.merchantLifetimePoints.toNumber(),
        }),
      ),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
