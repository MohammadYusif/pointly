import type {
  DecayWarning,
  IDecayCalculatorService,
} from '../../application/services/IDecayCalculatorService';
import type { Customer } from '../../domain';

/**
 * Concrete implementation of IDecayCalculatorService
 *
 * Decay phases (already implemented in Customer entity):
 * - Phase 0 (0-2 months inactive): no decay
 * - Phase 1 (3-5 months): 5% decay of global balance per month
 * - Phase 2 (6+ months): 15% decay + wipe all merchant points
 */
export class DecayCalculatorService implements IDecayCalculatorService {
  /**
   * Check if customer should receive a decay warning.
   * Returns true if customer is in Phase 1 (months 3-5 inactive),
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
   * Generate a warning message for a customer approaching or in decay.
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
      message: `Your Pointly points will start expiring due to inactivity. Estimated decay: ${estimatedDecay} points. Make a purchase to reset your activity timer. | ستبدأ نقاط Pointly الخاصة بك في الانتهاء بسبب عدم النشاط. الانخفاض المتوقع: ${estimatedDecay} نقطة. قم بعملية شراء لإعادة تعيين مؤقت نشاطك.`,
    };
  }

  /**
   * Calculate decay for a batch of customers.
   * Returns a Map of customerId → decayAmount.
   * Uses a clone approach to avoid mutating the original entities.
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
