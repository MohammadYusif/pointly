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

  // Decay system tracking
  lastNetworkActivity: Date; // Tracks ANY purchase at ANY merchant
  globalPointsDecayPhase: number; // 0=active, 1=light decay, 2=heavy decay
  decayStartDate?: Date; // When decay phase began
  lastDecayAppliedAt?: Date; // Last time decay was calculated

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

      // Initialize decay tracking
      lastNetworkActivity: new Date(),
      globalPointsDecayPhase: 0, // Start active (no decay)

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

  getLastNetworkActivity(): Date {
    return this.props.lastNetworkActivity;
  }

  getGlobalPointsDecayPhase(): number {
    return this.props.globalPointsDecayPhase;
  }

  getDecayStartDate(): Date | undefined {
    return this.props.decayStartDate;
  }

  getLastDecayAppliedAt(): Date | undefined {
    return this.props.lastDecayAppliedAt;
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

    // Reset decay timer when customer makes any purchase
    this.resetDecayTimer();

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

  // Decay management methods

  /**
   * Check how many months of inactivity
   */
  getMonthsOfInactivity(): number {
    const now = new Date();
    const diffTime = Math.abs(
      now.getTime() - this.props.lastNetworkActivity.getTime(),
    );
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30); // Approximate months
    return Math.floor(diffMonths);
  }

  /**
   * Determine decay phase based on inactivity
   * Uses 3-month grace period:
   * - Months 0-2: Active (no decay)
   * - Months 3-5: Light decay (5% per month)
   * - Months 6+: Heavy decay (15% per month)
   */
  calculateDecayPhase(): number {
    const monthsInactive = this.getMonthsOfInactivity();

    if (monthsInactive < 3) {
      return 0; // Active - no decay (3-month grace period)
    } else if (monthsInactive < 6) {
      return 1; // Light decay (months 3-5) - 5% per month
    } else {
      return 2; // Heavy decay (month 6+) - 15% per month
    }
  }

  /**
   * Calculate how many points should decay based on inactivity
   */
  calculateDecayAmount(): Points {
    const phase = this.calculateDecayPhase();

    if (phase === 0) {
      return Points.zero(); // No decay during grace period
    }

    const monthsInactive = this.getMonthsOfInactivity();
    let balance = this.props.globalPointsBalance.toNumber();

    // Calculate months in each phase
    const lightDecayMonths = Math.min(Math.max(monthsInactive - 3, 0), 3); // Months 3-5 (up to 3 months)
    const heavyDecayMonths = Math.max(monthsInactive - 6, 0); // Month 6+

    // Apply light decay (5% per month) for months 3-5
    for (let i = 0; i < lightDecayMonths; i++) {
      balance = Math.floor(balance * 0.95);
    }

    // Apply heavy decay (15% per month) for month 6+
    for (let i = 0; i < heavyDecayMonths; i++) {
      balance = Math.floor(balance * 0.85);
    }

    const decayAmount = this.props.globalPointsBalance.toNumber() - balance;
    return Points.from(decayAmount);
  }

  /**
   * Apply decay to global points
   */
  applyGlobalPointsDecay(): Points {
    const decayAmount = this.calculateDecayAmount();

    if (decayAmount.isZero()) {
      return Points.zero();
    }

    this.props.globalPointsBalance =
      this.props.globalPointsBalance.subtract(decayAmount);

    this.props.lastDecayAppliedAt = new Date();
    this.props.globalPointsDecayPhase = this.calculateDecayPhase();
    this.props.updatedAt = new Date();

    return decayAmount;
  }

  /**
   * Reset decay timer when customer makes a purchase
   */
  resetDecayTimer(): void {
    this.props.lastNetworkActivity = new Date();
    this.props.globalPointsDecayPhase = 0;
    delete this.props.decayStartDate;
    delete this.props.lastDecayAppliedAt;
    this.props.updatedAt = new Date();
  }

  /**
   * Update decay phase (for monthly job)
   */
  updateDecayPhase(): void {
    const newPhase = this.calculateDecayPhase();

    if (newPhase !== this.props.globalPointsDecayPhase) {
      this.props.globalPointsDecayPhase = newPhase;

      if (newPhase > 0 && !this.props.decayStartDate) {
        this.props.decayStartDate = new Date();
      }

      this.props.updatedAt = new Date();
    }
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

      // Decay tracking
      lastNetworkActivity: this.props.lastNetworkActivity.toISOString(),
      globalPointsDecayPhase: this.props.globalPointsDecayPhase,
      decayStartDate: this.props.decayStartDate?.toISOString(),
      lastDecayAppliedAt: this.props.lastDecayAppliedAt?.toISOString(),
      monthsOfInactivity: this.getMonthsOfInactivity(),

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
