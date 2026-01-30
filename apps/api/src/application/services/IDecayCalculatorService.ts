import { Customer } from "../../domain";

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
 * Decay timeline (3-month grace period):
 * - Months 0-2: Active (no decay)
 * - Months 3-5: Light decay (5% per month)
 * - Months 6+: Heavy decay (15% per month)
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
}
