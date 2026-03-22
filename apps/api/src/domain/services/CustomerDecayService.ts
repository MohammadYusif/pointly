import type { Customer } from '../entities/Customer';
import type { Points } from '../value-objects/Points';

/**
 * CustomerDecayService
 *
 * Pure domain service encapsulating monthly points-decay calculation and
 * application for a Customer aggregate.
 *
 * This is the canonical entry point for decay operations in the application
 * layer. Use cases should depend on this service rather than calling Customer
 * decay methods directly.
 *
 * Decay timeline (KSA Ministry of Commerce compliant — 12-month grace period):
 *   Phase 0 (months 0–11):  Active — no decay
 *   Phase 1 (months 12–17): Light decay — 5% of global balance per month
 *   Phase 2 (month 18+):    Heavy decay — 15% of global balance per month
 *                           + wipes all merchant point balances (zombie cleanup)
 *
 * Decay-immune tiers (Gold / Platinum / Diamond) are exempt from global-point
 * reduction but still lose merchant balances when Phase 2 is triggered.
 */
export class CustomerDecayService {
  /**
   * Calculate the number of points that should decay for ONE monthly run.
   *
   * Pure calculation — does not mutate the customer.
   * Returns Points.zero() when the customer is in the grace period or is on a
   * decay-immune tier.
   */
  calculateMonthlyDecay(customer: Customer): Points {
    return customer.calculateDecayAmount();
  }

  /**
   * Apply one month of decay to the customer aggregate.
   *
   * Delegates to `Customer.applyGlobalPointsDecay()`, which:
   *   1. Triggers merchant-balance wipe when Phase 2 is entered.
   *   2. Subtracts the calculated decay from the global balance.
   *   3. Updates tracking fields (lastDecayAppliedAt, globalPointsDecayPhase).
   *
   * Returns the amount of points removed (Points.zero() when no decay applied).
   */
  applyMonthlyDecay(customer: Customer): Points {
    return customer.applyGlobalPointsDecay();
  }
}
