import { ulid } from 'ulid';
import { ValidationError } from '../errors/DomainError';
import { CustomerTier } from '../value-objects/CustomerTier';
import type { PhoneNumber } from '../value-objects/PhoneNumber';
import { Points } from '../value-objects/Points';

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum ConsentStatus {
  PENDING = 'PENDING',
  GRANTED = 'GRANTED',
  REVOKED = 'REVOKED',
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
  welcomeBonusApplied: boolean;
}

export interface CustomerProps {
  customerId: string;
  phone: PhoneNumber;
  name?: string;
  dateOfBirth?: string;
  status: CustomerStatus;

  // Points & Balance
  globalPointsBalance: Points; // Spendable (can go down)
  globalLifetimePoints: Points; // Total ever earned (never decreases)

  // NEW - Tier System
  currentTier: CustomerTier; // Current status level
  monthlyProgress: Points; // Points earned THIS calendar month
  tierLastUpdatedAt: Date; // When tier was last changed
  monthlyProgressResetAt: Date; // Last time monthly progress reset

  // Decay tracking (existing)
  lastNetworkActivity: Date;
  globalPointsDecayPhase: number;
  decayStartDate?: Date | undefined;
  lastDecayAppliedAt?: Date | undefined;
  lastInactivityWarningSentAt?: Date; // dedup for 3/6/9-month engagement SMS

  enrollments: Map<string, CustomerEnrollment>;
  createdAt: Date;
  updatedAt: Date;
}

export class Customer {
  private constructor(private props: CustomerProps) {}

  // Factory methods
  static create(phone: PhoneNumber, name?: string, dateOfBirth?: string): Customer {
    const now = new Date();
    const props: CustomerProps = {
      customerId: ulid(),
      phone,
      status: CustomerStatus.ACTIVE,
      globalPointsBalance: Points.zero(),
      globalLifetimePoints: Points.zero(),

      // NEW - Initialize tier system
      currentTier: CustomerTier.bronze(), // Everyone starts as Bronze
      monthlyProgress: Points.zero(),
      tierLastUpdatedAt: now,
      monthlyProgressResetAt: now,

      // Decay tracking
      lastNetworkActivity: now,
      globalPointsDecayPhase: 0,

      enrollments: new Map(),
      createdAt: now,
      updatedAt: now,
    };

    if (name) {
      props.name = name;
    }
    if (dateOfBirth) {
      props.dateOfBirth = dateOfBirth;
    }

    return new Customer(props);
  }

  static createWithId(
    id: string,
    phone: PhoneNumber,
    name?: string,
    dateOfBirth?: string,
  ): Customer {
    const now = new Date();
    const props: CustomerProps = {
      customerId: id,
      phone,
      status: CustomerStatus.ACTIVE,
      globalPointsBalance: Points.zero(),
      globalLifetimePoints: Points.zero(),
      currentTier: CustomerTier.bronze(),
      monthlyProgress: Points.zero(),
      tierLastUpdatedAt: now,
      monthlyProgressResetAt: now,
      lastNetworkActivity: now,
      globalPointsDecayPhase: 0,
      enrollments: new Map(),
      createdAt: now,
      updatedAt: now,
    };

    if (name) {
      props.name = name;
    }
    if (dateOfBirth) {
      props.dateOfBirth = dateOfBirth;
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

  // Add after existing getters (around line 110)

  getCurrentTier(): CustomerTier {
    return this.props.currentTier;
  }

  getMonthlyProgress(): Points {
    return this.props.monthlyProgress;
  }

  getTierLastUpdatedAt(): Date {
    return this.props.tierLastUpdatedAt;
  }

  getMonthlyProgressResetAt(): Date {
    return this.props.monthlyProgressResetAt;
  }

  /**
   * Get earning multiplier based on tier (e.g., 1.2x for Diamond)
   */
  getEarningMultiplier(): number {
    return this.props.currentTier.getEarningMultiplier();
  }

  /**
   * Check if this customer's tier is immune to point decay
   */
  isDecayImmune(): boolean {
    return this.props.currentTier.isDecayImmune();
  }

  // Business methods
  enrollWithMerchant(merchantId: string): void {
    if (this.props.status !== CustomerStatus.ACTIVE) {
      throw new ValidationError('Customer must be active to enroll');
    }

    if (this.props.enrollments.has(merchantId)) {
      throw new ValidationError('Customer already enrolled with this merchant');
    }

    const now = new Date();
    const enrollment: CustomerEnrollment = {
      merchantId,
      enrolledAt: now,
      consentStatus: ConsentStatus.GRANTED,
      consentGrantedAt: now,
      merchantPointsBalance: Points.zero(),
      merchantLifetimePoints: Points.zero(),
      transactionCount: 0,
      welcomeBonusApplied: false,
    };

    this.props.enrollments.set(merchantId, enrollment);
    this.props.updatedAt = new Date();
  }

  /** @deprecated Consent is now auto-granted on enrollment. Kept for backward compat (idempotent no-op). */
  grantConsent(merchantId: string): void {
    const enrollment = this.props.enrollments.get(merchantId);
    if (!enrollment) {
      throw new ValidationError('Customer not enrolled with this merchant');
    }

    // Already granted on enrollment — idempotent no-op
    if (enrollment.consentStatus === ConsentStatus.GRANTED) {
      return;
    }

    enrollment.consentStatus = ConsentStatus.GRANTED;
    enrollment.consentGrantedAt = new Date();
    this.props.updatedAt = new Date();
  }

  revokeConsent(merchantId: string): void {
    const enrollment = this.props.enrollments.get(merchantId);
    if (!enrollment) {
      throw new ValidationError('Customer not enrolled with this merchant');
    }

    enrollment.consentStatus = ConsentStatus.REVOKED;
    this.props.updatedAt = new Date();
  }

  /**
   * Apply the merchant's welcome bonus points at enrollment time.
   * Does NOT require consent — this is part of the enrollment flow itself.
   * Can only be applied once per enrollment.
   */
  applyWelcomeBonus(merchantId: string, globalPoints: Points, merchantPoints: Points): void {
    const enrollment = this.props.enrollments.get(merchantId);
    if (!enrollment) {
      throw new ValidationError('Customer not enrolled with this merchant');
    }

    if (enrollment.welcomeBonusApplied) {
      throw new ValidationError('Welcome bonus has already been applied for this merchant');
    }

    this.props.globalPointsBalance = this.props.globalPointsBalance.add(globalPoints);
    this.props.globalLifetimePoints = this.props.globalLifetimePoints.add(globalPoints);

    enrollment.merchantPointsBalance = enrollment.merchantPointsBalance.add(merchantPoints);
    enrollment.merchantLifetimePoints = enrollment.merchantLifetimePoints.add(merchantPoints);

    enrollment.welcomeBonusApplied = true;
    this.props.updatedAt = new Date();
  }

  /**
   * Add points from a purchase - awards both global (Pointly Network) and merchant-specific points
   */
  addPointsFromPurchase(
    merchantId: string,
    globalPoints: Points,
    merchantPoints: Points,
  ): { boostedGlobalPoints: Points } {
    const enrollment = this.props.enrollments.get(merchantId);
    if (!enrollment) {
      throw new ValidationError('Customer not enrolled with this merchant');
    }

    // Lazy reset: if we're in a new month and cron job missed us, reset progress now
    if (this.isNewMonth(this.props.monthlyProgressResetAt)) {
      this.resetMonthlyProgress();
    }

    // Apply tier earning multiplier (e.g., Diamond gets 1.2x points)
    // Use integer-percentage math to avoid IEEE 754 precision loss
    // (e.g., Math.floor(100 * 1.15) = 114 due to 1.15 → 1.14999... in double)
    const earningMultiplier = this.props.currentTier.getEarningMultiplier();
    const boostedPoints = Points.from(
      Math.floor((globalPoints.toNumber() * Math.round(earningMultiplier * 100)) / 100),
    );

    // Add boosted global points to balance (reward)
    this.props.globalPointsBalance = this.props.globalPointsBalance.add(boostedPoints);
    this.props.globalLifetimePoints = this.props.globalLifetimePoints.add(boostedPoints);

    // Track RAW points for monthly progress (tier qualification based on actual spending)
    this.props.monthlyProgress = this.props.monthlyProgress.add(globalPoints);

    // NEW - Check if tier should be upgraded immediately
    const potentialTier = CustomerTier.fromMonthlyProgress(this.props.monthlyProgress.toNumber());

    if (potentialTier.isHigherThan(this.props.currentTier)) {
      this.props.currentTier = potentialTier;
      this.props.tierLastUpdatedAt = new Date();
    }

    // Add merchant-specific points
    enrollment.merchantPointsBalance = enrollment.merchantPointsBalance.add(merchantPoints);
    enrollment.merchantLifetimePoints = enrollment.merchantLifetimePoints.add(merchantPoints);

    enrollment.transactionCount++;
    enrollment.lastTransactionAt = new Date();

    // Reset decay timer
    this.resetDecayTimer();

    this.props.updatedAt = new Date();

    return { boostedGlobalPoints: boostedPoints };
  }

  /**
   * Redeem global Pointly Network points (usable at any merchant)
   * NOTE: Tier is NOT affected by redemption - only by monthly earning
   */
  redeemGlobalPoints(points: Points): void {
    if (this.props.status !== CustomerStatus.ACTIVE) {
      throw new ValidationError('Customer must be active to redeem points');
    }

    if (this.props.globalPointsBalance.isLessThan(points)) {
      throw new ValidationError('Insufficient global points balance');
    }

    this.props.globalPointsBalance = this.props.globalPointsBalance.subtract(points);

    // Tier and monthly progress DO NOT CHANGE when redeeming

    this.props.updatedAt = new Date();
  }

  /**
   * Redeem merchant-specific points (only at that merchant)
   */
  redeemMerchantPoints(merchantId: string, points: Points): void {
    if (this.props.status !== CustomerStatus.ACTIVE) {
      throw new ValidationError('Customer must be active to redeem points');
    }

    const enrollment = this.props.enrollments.get(merchantId);
    if (!enrollment) {
      throw new ValidationError('Customer not enrolled with this merchant');
    }

    if (enrollment.merchantPointsBalance.isLessThan(points)) {
      throw new ValidationError('Insufficient merchant points balance');
    }

    enrollment.merchantPointsBalance = enrollment.merchantPointsBalance.subtract(points);
    enrollment.transactionCount++;
    enrollment.lastTransactionAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Smart Redemption: Prioritizes Merchant Points, then uses Global Points.
   * Returns the split so the Use Case can create two separate transaction records.
   *
   * Example: Customer has 400 merchant points and 1000 global points.
   * If they redeem 1000 points total:
   * - Uses 400 from merchant wallet (drains it)
   * - Uses 600 from global wallet
   *
   * @param merchantId - The merchant where redemption is happening
   * @param totalPointsNeeded - Total points to redeem
   * @returns Split of merchant vs global points used for transaction records
   */
  redeemSmart(
    merchantId: string,
    totalPointsNeeded: Points,
  ): { merchantPointsUsed: Points; globalPointsUsed: Points } {
    if (this.props.status !== CustomerStatus.ACTIVE) {
      throw new ValidationError('Customer must be active to redeem points');
    }

    if (totalPointsNeeded.isZero()) {
      throw new ValidationError('Points to redeem must be greater than zero');
    }

    const enrollment = this.getEnrollment(merchantId);
    const merchantBalance = enrollment ? enrollment.merchantPointsBalance : Points.zero();
    const globalBalance = this.props.globalPointsBalance;

    // Validate total available points
    const totalAvailable = merchantBalance.add(globalBalance);
    if (totalAvailable.isLessThan(totalPointsNeeded)) {
      throw new ValidationError('Insufficient total points balance');
    }

    let merchantPointsUsed = Points.zero();
    let globalPointsUsed = Points.zero();

    // 1. Try to satisfy entirely from Merchant Wallet first
    if (merchantBalance.isGreaterThanOrEqual(totalPointsNeeded)) {
      merchantPointsUsed = totalPointsNeeded;
      this.redeemMerchantPoints(merchantId, merchantPointsUsed);
    } else {
      // 2. Take everything from Merchant Wallet
      merchantPointsUsed = merchantBalance;
      if (merchantPointsUsed.toNumber() > 0) {
        this.redeemMerchantPoints(merchantId, merchantPointsUsed);
      }

      // 3. Take remainder from Global Wallet
      globalPointsUsed = totalPointsNeeded.subtract(merchantPointsUsed);
      this.redeemGlobalPoints(globalPointsUsed);
    }

    return { merchantPointsUsed, globalPointsUsed };
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
    const diffTime = Math.abs(now.getTime() - this.props.lastNetworkActivity.getTime());
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30); // Approximate months
    return Math.floor(diffMonths);
  }

  /**
   * Determine decay phase based on inactivity
   * KSA Ministry of Commerce compliant — 12-month grace period:
   * - Months 0-11: Active (no decay)
   * - Months 12-17: Light decay (5% per month)
   * - Months 18+: Heavy decay (15% per month)
   */
  calculateDecayPhase(): number {
    const monthsInactive = this.getMonthsOfInactivity();

    if (monthsInactive < 12) {
      return 0; // Active — no decay (12-month grace period)
    }
    if (monthsInactive < 18) {
      return 1; // Light decay (months 12-17) — 5% per month
    }
    return 2; // Heavy decay (month 18+) — 15% per month
  }

  /**
   * Get the date when points will start to decay (lastNetworkActivity + 12 months).
   * Shown to customers as a countdown for retention engagement.
   */
  getNextDecayDate(): Date {
    return new Date(this.props.lastNetworkActivity.getTime() + 365 * 24 * 60 * 60 * 1000);
  }

  /**
   * Mark that an inactivity warning SMS was sent this month.
   * Used to dedup 3/6/9-month engagement messages.
   */
  markInactivityWarningSent(): void {
    this.props.lastInactivityWarningSentAt = new Date();
    this.props.updatedAt = new Date();
  }

  getLastInactivityWarningSentAt(): Date | undefined {
    return this.props.lastInactivityWarningSentAt;
  }

  /**
   * Calculate how many points should decay based on inactivity
   */
  calculateDecayAmount(): Points {
    const phase = this.calculateDecayPhase();

    if (phase === 0) {
      return Points.zero(); // No decay during grace period
    }

    // Gold and Diamond tiers are immune to decay
    if (this.props.currentTier.isDecayImmune()) {
      return Points.zero();
    }

    const monthsInactive = this.getMonthsOfInactivity();
    let balance = this.props.globalPointsBalance.toNumber();

    // Calculate months in each phase (12-month grace period)
    const lightDecayMonths = Math.min(Math.max(monthsInactive - 12, 0), 6); // Months 12-17 (up to 6 months)
    const heavyDecayMonths = Math.max(monthsInactive - 18, 0); // Month 18+

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
   *
   * Phase 2 (6+ months inactive) triggers zombie cleanup for ALL users,
   * regardless of tier immunity. Decay-immune tiers (Gold/Diamond)
   * keep their global points but still lose merchant points.
   */
  applyGlobalPointsDecay(): Points {
    const phase = this.calculateDecayPhase();

    // Phase 2 zombie cleanup applies to ALL users, including decay-immune tiers
    // This prevents accumulation of stale merchant points from inactive users
    if (phase === 2) {
      this.wipeMerchantPointBalances();
    }

    const decayAmount = this.calculateDecayAmount();

    // Even if no global decay (decay-immune tier), update tracking if in decay phase
    if (decayAmount.isZero()) {
      if (phase > 0) {
        this.props.lastDecayAppliedAt = new Date();
        this.props.globalPointsDecayPhase = phase;
        this.props.updatedAt = new Date();
      }
      return Points.zero();
    }

    this.props.globalPointsBalance = this.props.globalPointsBalance.subtract(decayAmount);
    this.props.lastDecayAppliedAt = new Date();
    this.props.globalPointsDecayPhase = phase;
    this.props.updatedAt = new Date();

    return decayAmount;
  }

  /**
   * Wipe all merchant point balances for deeply inactive users
   * Called when user enters Phase 2 (6+ months inactive)
   * Applies to ALL users regardless of tier immunity (zombie cleanup)
   */
  private wipeMerchantPointBalances(): void {
    for (const enrollment of this.props.enrollments.values()) {
      enrollment.merchantPointsBalance = Points.zero();
    }
  }

  /**
   * Reset decay timer when customer makes a purchase
   */
  resetDecayTimer(): void {
    this.props.lastNetworkActivity = new Date();
    this.props.globalPointsDecayPhase = 0;
    this.props.decayStartDate = undefined;
    this.props.lastDecayAppliedAt = undefined;
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

  // Add before toJSON() method

  /**
   * Check if customer qualifies for current tier based on monthly progress
   */
  qualifiesForCurrentTier(): boolean {
    return this.props.currentTier.meetsQualification(this.props.monthlyProgress.toNumber());
  }

  /**
   * Check if we are in a new month relative to the last reset date
   * Used for lazy monthly reset to prevent "double dip" when cron fails
   *
   * Uses UTC to ensure consistent behavior across timezones and server locations.
   * This prevents edge cases around midnight where local time might differ.
   */
  private isNewMonth(lastResetDate: Date): boolean {
    const now = new Date();
    return (
      now.getUTCFullYear() > lastResetDate.getUTCFullYear() ||
      (now.getUTCFullYear() === lastResetDate.getUTCFullYear() &&
        now.getUTCMonth() > lastResetDate.getUTCMonth())
    );
  }

  /**
   * Reset monthly progress (called on 1st of month)
   */
  resetMonthlyProgress(): void {
    this.props.monthlyProgress = Points.zero();
    this.props.monthlyProgressResetAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Update tier based on monthly progress
   * Called by monthly reset job
   *
   * Instead of recalculating from scratch (which would drop Diamond to Bronze),
   * we only decay one level if the user didn't maintain their current tier.
   */
  updateTierFromProgress(): CustomerTier {
    const oldTier = this.props.currentTier;

    // If user maintained their tier requirements, keep their tier
    if (this.qualifiesForCurrentTier()) {
      return oldTier;
    }

    // Otherwise, decay one level (Diamond -> Platinum, not Bronze)
    const newTier = oldTier.decay();

    if (!newTier.equals(oldTier)) {
      this.props.currentTier = newTier;
      this.props.tierLastUpdatedAt = new Date();
      this.props.updatedAt = new Date();
    }

    return newTier;
  }

  /**
   * Manually set tier (admin override)
   */
  setTier(tier: CustomerTier, _reason: string): void {
    this.props.currentTier = tier;
    this.props.tierLastUpdatedAt = new Date();
    this.props.updatedAt = new Date();
  }

  /**
   * Get points needed to reach next tier
   */
  getPointsToNextTier(): number {
    const currentProgress = this.props.monthlyProgress.toNumber();
    const next = this.props.currentTier.nextTier();
    if (!next) return 0; // Already at max tier
    return Math.max(0, next.getMonthlyMinimum() - currentProgress);
  }
  /**
   * Merchant-scoped view: exposes only the data a merchant is allowed to see.
   * Excludes global points balance and other merchants' enrollments.
   * Returns null if the customer is not enrolled with the given merchant.
   */
  toMerchantScopedView(merchantId: string) {
    const enrollment = this.props.enrollments.get(merchantId);
    if (!enrollment) return null;

    return {
      customerId: this.props.customerId,
      phone: this.props.phone.toString(),
      name: this.props.name,
      status: this.props.status,
      currentTier: this.props.currentTier.getLevel(),
      tierDisplayName: this.props.currentTier.getDisplayName(),
      tierColor: this.props.currentTier.getColor(),
      nextDecayDate: this.getNextDecayDate().toISOString(),
      enrollment: {
        merchantId: enrollment.merchantId,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        consentStatus: enrollment.consentStatus,
        consentGrantedAt: enrollment.consentGrantedAt?.toISOString(),
        merchantPointsBalance: enrollment.merchantPointsBalance.toNumber(),
        merchantLifetimePoints: enrollment.merchantLifetimePoints.toNumber(),
        transactionCount: enrollment.transactionCount,
        lastTransactionAt: enrollment.lastTransactionAt?.toISOString(),
        welcomeBonusApplied: enrollment.welcomeBonusApplied,
      },
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }

  // Serialization
  toJSON() {
    return {
      customerId: this.props.customerId,
      phone: this.props.phone.toString(),
      name: this.props.name,
      dateOfBirth: this.props.dateOfBirth,
      status: this.props.status,
      globalPointsBalance: this.props.globalPointsBalance.toNumber(),
      globalLifetimePoints: this.props.globalLifetimePoints.toNumber(),

      // NEW - Tier info
      currentTier: this.props.currentTier.getLevel(),
      tierDisplayName: this.props.currentTier.getDisplayName(),
      tierColor: this.props.currentTier.getColor(),
      monthlyProgress: this.props.monthlyProgress.toNumber(),
      pointsToNextTier: this.getPointsToNextTier(),
      earningMultiplier: this.getEarningMultiplier(),
      isDecayImmune: this.isDecayImmune(),
      tierLastUpdatedAt: this.props.tierLastUpdatedAt.toISOString(),
      monthlyProgressResetAt: this.props.monthlyProgressResetAt.toISOString(),

      // Decay tracking
      lastNetworkActivity: this.props.lastNetworkActivity.toISOString(),
      nextDecayDate: this.getNextDecayDate().toISOString(),
      globalPointsDecayPhase: this.props.globalPointsDecayPhase,
      decayStartDate: this.props.decayStartDate?.toISOString(),
      lastDecayAppliedAt: this.props.lastDecayAppliedAt?.toISOString(),
      lastInactivityWarningSentAt: this.props.lastInactivityWarningSentAt?.toISOString(),
      monthsOfInactivity: this.getMonthsOfInactivity(),

      enrollments: Array.from(this.props.enrollments.entries()).map(([, enrollment]) => ({
        merchantId: enrollment.merchantId,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        consentStatus: enrollment.consentStatus,
        consentGrantedAt: enrollment.consentGrantedAt?.toISOString(),
        merchantPointsBalance: enrollment.merchantPointsBalance.toNumber(),
        merchantLifetimePoints: enrollment.merchantLifetimePoints.toNumber(),
        transactionCount: enrollment.transactionCount,
        lastTransactionAt: enrollment.lastTransactionAt?.toISOString(),
        welcomeBonusApplied: enrollment.welcomeBonusApplied,
      })),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
