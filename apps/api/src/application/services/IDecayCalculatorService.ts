import type { Customer } from '../../domain';

export interface DecayWarning {
  customerId: string;
  phone: string;
  currentBalance: number;
  decayPhase: number;
  monthsInactive: number;
  estimatedDecay: number;
  message: string;
}

/**
 * Service for calculating and managing points decay
 *
 * Decay timeline (12-month grace period):
 * - Months 0-11: Active, no decay (engagement SMS at months 3, 6, 9)
 * - Months 12-17: Phase 1 — 5% per month
 * - Months 18+: Phase 2 — 15% per month
 * Gold, Platinum, and Diamond customers are decay-immune.
 */
export interface IDecayCalculatorService {
  /**
   * Check if customer should receive decay warning
   */
  shouldWarnCustomer(customer: Customer): boolean;

  /**
   * Generate warning message for customer
   */
  generateWarningMessage(customer: Customer): DecayWarning | null;

  /**
   * Calculate decay for a batch of customers
   */
  calculateBatchDecay(customers: Customer[]): Map<string, number>;

  /**
   * Returns the inactivity milestone (3, 6, or 9 months) if an engagement
   * SMS should be sent now, or null if no SMS needed.
   */
  getInactivityMilestone(customer: Customer): 3 | 6 | 9 | null;
}
