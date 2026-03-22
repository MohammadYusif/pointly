import { type Customer, TIER_ORDER } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';

export interface TierResetResult {
  totalCustomersProcessed: number;
  tierChanges: {
    upgrades: number;
    downgrades: number;
    maintained: number;
  };
  tierDistribution: Record<string, number>;
  errors: string[];
}

/**
 * ProcessMonthlyTierResetUseCase
 *
 * Runs on the 1st of every month (EventBridge scheduler)
 *
 * For each customer:
 * 1. Check if they qualified for their current tier based on last month's progress
 * 2. Update tier (upgrade, downgrade, or maintain)
 * 3. Reset monthlyProgress to 0 for the new month
 */
export class ProcessMonthlyTierResetUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(): Promise<TierResetResult> {
    // Build tier distribution dynamically from TIER_ORDER
    const tierDistribution: Record<string, number> = {};
    for (const tier of TIER_ORDER) {
      tierDistribution[tier.toLowerCase()] = 0;
    }

    const result: TierResetResult = {
      totalCustomersProcessed: 0,
      tierChanges: {
        upgrades: 0,
        downgrades: 0,
        maintained: 0,
      },
      tierDistribution,
      errors: [],
    };

    try {
      // Get all customers (in production, this would be paginated)
      const customers = await this.getAllCustomers();

      for (const customer of customers) {
        try {
          result.totalCustomersProcessed++;

          const oldTier = customer.getCurrentTier();

          // Update tier based on last month's progress
          const newTier = customer.updateTierFromProgress();

          // Track changes
          if (newTier.isHigherThan(oldTier)) {
            result.tierChanges.upgrades++;
          } else if (newTier.isLowerThan(oldTier)) {
            result.tierChanges.downgrades++;
          } else {
            result.tierChanges.maintained++;
          }

          // Reset monthly progress for new month
          customer.resetMonthlyProgress();

          // Single-entity write: no transaction semantics needed here.
          await this.customerRepository.save(customer);

          // Count tier distribution
          const tierKey = newTier.getLevel().toLowerCase();
          result.tierDistribution[tierKey] = (result.tierDistribution[tierKey] || 0) + 1;
        } catch (error) {
          result.errors.push(
            `Error processing customer ${customer.getCustomerId()}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    } catch (error) {
      result.errors.push(
        `Fatal error in tier reset: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return result;
  }

  private async getAllCustomers(): Promise<Customer[]> {
    const allCustomers: Customer[] = [];
    let nextToken: string | undefined;
    do {
      const result = await this.customerRepository.findAll({
        limit: 100,
        ...(nextToken ? { nextToken } : {}),
      });
      allCustomers.push(...result.items);
      nextToken = result.nextToken;
    } while (nextToken);
    return allCustomers;
  }
}
