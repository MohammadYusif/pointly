import { type Customer, CustomerTierLevel } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';

export interface TierResetResult {
  totalCustomersProcessed: number;
  tierChanges: {
    upgrades: number;
    downgrades: number;
    maintained: number;
  };
  tierDistribution: {
    bronze: number;
    platinum: number;
    diamond: number;
  };
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
    const result: TierResetResult = {
      totalCustomersProcessed: 0,
      tierChanges: {
        upgrades: 0,
        downgrades: 0,
        maintained: 0,
      },
      tierDistribution: {
        bronze: 0,
        platinum: 0,
        diamond: 0,
      },
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

          // Save customer
          await this.customerRepository.save(customer);

          // Count tier distribution
          const tierLevel = newTier.getLevel();
          if (tierLevel === CustomerTierLevel.BRONZE) {
            result.tierDistribution.bronze++;
          } else if (tierLevel === CustomerTierLevel.PLATINUM) {
            result.tierDistribution.platinum++;
          } else if (tierLevel === CustomerTierLevel.DIAMOND) {
            result.tierDistribution.diamond++;
          }
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
