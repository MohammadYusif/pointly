import type {
  DecayWarning,
  IDecayCalculatorService,
} from '../../application/services/IDecayCalculatorService';
import type { Customer } from '../../domain';

/**
 * Concrete implementation of IDecayCalculatorService
 *
 * Decay phases (KSA Ministry of Commerce compliant — 12-month grace period):
 * - Phase 0 (0-11 months inactive): no decay
 * - Phase 1 (12-17 months): 5% decay of global balance per month
 * - Phase 2 (18+ months): 15% decay + wipe all merchant points
 *
 * Engagement SMS sent at 3, 6, 9 months (during grace period) to prompt re-engagement.
 */
export class DecayCalculatorService implements IDecayCalculatorService {
  /**
   * Check if customer should receive a decay warning.
   * Returns true if customer is in Phase 1 (months 12-17 inactive),
   * has a positive balance, and warning hasn't been sent this month.
   */
  shouldWarnCustomer(customer: Customer): boolean {
    const phase = customer.calculateDecayPhase();

    if (phase !== 1) {
      return false;
    }

    if (customer.getGlobalPointsBalance().isZero()) {
      return false;
    }

    // Check if warning was already sent this month
    const lastDecayAppliedAt = customer.getLastDecayAppliedAt();
    if (lastDecayAppliedAt) {
      const now = new Date();
      if (
        lastDecayAppliedAt.getUTCFullYear() === now.getUTCFullYear() &&
        lastDecayAppliedAt.getUTCMonth() === now.getUTCMonth()
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate a warning message for a customer in Phase 1 (months 12-17, active decay).
   */
  generateWarningMessage(customer: Customer): DecayWarning | null {
    if (!this.shouldWarnCustomer(customer)) {
      return null;
    }

    const balance = customer.getGlobalPointsBalance().toNumber();
    const estimatedDecay = Math.floor(balance * 0.05); // Phase 1: 5% rate

    return {
      customerId: customer.getCustomerId(),
      phone: customer.getPhone().toE164(),
      currentBalance: balance,
      decayPhase: customer.calculateDecayPhase(),
      monthsInactive: customer.getMonthsOfInactivity(),
      estimatedDecay,
      message: `Your Pointly points are expiring due to inactivity. Estimated decay: ${estimatedDecay} points. Make a purchase to reset your activity timer. | ستبدأ نقاط Pointly الخاصة بك في الانتهاء بسبب عدم النشاط. الانخفاض المتوقع: ${estimatedDecay} نقطة. قم بعملية شراء لإعادة تعيين مؤقت نشاطك.`,
    };
  }

  /**
   * Returns the engagement milestone (3, 6, or 9 months) if a proactive SMS
   * should be sent now during the 12-month grace period, or null otherwise.
   * Deduplicates by checking lastInactivityWarningSentAt.
   */
  getInactivityMilestone(customer: Customer): 3 | 6 | 9 | null {
    if (customer.getGlobalPointsBalance().isZero()) {
      return null;
    }

    const months = customer.getMonthsOfInactivity();
    let milestone: 3 | 6 | 9 | null = null;

    if (months >= 3 && months < 4) milestone = 3;
    else if (months >= 6 && months < 7) milestone = 6;
    else if (months >= 9 && months < 10) milestone = 9;

    if (!milestone) return null;

    // Dedup: don't send if we already sent an inactivity warning this month
    const lastSent = customer.getLastInactivityWarningSentAt();
    if (lastSent) {
      const now = new Date();
      if (
        lastSent.getUTCFullYear() === now.getUTCFullYear() &&
        lastSent.getUTCMonth() === now.getUTCMonth()
      ) {
        return null;
      }
    }

    return milestone;
  }

  /**
   * Calculate decay for a batch of customers.
   * Returns a Map of customerId → decayAmount.
   */
  calculateBatchDecay(customers: Customer[]): Map<string, number> {
    const decayMap = new Map<string, number>();

    for (const customer of customers) {
      const decayAmount = customer.calculateDecayAmount();
      if (!decayAmount.isZero()) {
        decayMap.set(customer.getCustomerId(), decayAmount.toNumber());
      }
    }

    return decayMap;
  }
}
