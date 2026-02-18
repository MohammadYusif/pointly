import { type Customer, Transaction } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import type { IDecayCalculatorService } from '../services/IDecayCalculatorService';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface DecayProcessingResult {
  totalCustomersProcessed: number;
  customersWithDecay: number;
  totalPointsDecayed: number;
  warningsSent: number;
  errors: string[];
}

/**
 * ProcessPointsDecayUseCase - Monthly job to process global points decay
 *
 * Decay timeline (3-month grace period):
 * - Months 0-2: Active (no decay)
 * - Months 3-5: Light decay (5% per month)
 * - Months 6+: Heavy decay (15% per month)
 *
 * This should run as a Lambda on a monthly schedule (EventBridge)
 */
export class ProcessPointsDecayUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private transactionRepository: ITransactionRepository,
    private decayCalculator: IDecayCalculatorService,
    private atomicWrite?: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  async execute(): Promise<DecayProcessingResult> {
    const result: DecayProcessingResult = {
      totalCustomersProcessed: 0,
      customersWithDecay: 0,
      totalPointsDecayed: 0,
      warningsSent: 0,
      errors: [],
    };

    try {
      // Get all customers (in production, this would be paginated)
      const customers = await this.getAllCustomers();

      for (const customer of customers) {
        try {
          result.totalCustomersProcessed++;

          // Update decay phase
          customer.updateDecayPhase();

          // Check if customer needs warning
          if (this.decayCalculator.shouldWarnCustomer(customer)) {
            const warning = this.decayCalculator.generateWarningMessage(customer);
            if (warning) {
              // Send SMS warning (would integrate with SNS/SQS here)
              console.log(`Warning for customer ${warning.customerId}: ${warning.message}`);
              result.warningsSent++;
            }
          }

          // Calculate and apply decay
          const balanceBeforeDecay = customer.getGlobalPointsBalance();
          const decayAmount = customer.applyGlobalPointsDecay();

          if (!decayAmount.isZero()) {
            result.customersWithDecay++;
            result.totalPointsDecayed += decayAmount.toNumber();

            // Create expiration transaction
            const transaction = Transaction.createExpiration(
              'SYSTEM',
              customer.getCustomerId(),
              decayAmount,
              balanceBeforeDecay,
              `decay_${customer.getCustomerId()}_${Date.now()}`,
              {
                reason: 'monthly_inactivity_decay',
                decayPhase: customer.getGlobalPointsDecayPhase().toString(),
                monthsInactive: customer.getMonthsOfInactivity().toString(),
              },
            );

            // Save transaction and customer atomically
            if (this.atomicWrite) {
              await this.atomicWrite([
                ...this.transactionRepository.toPersistenceItem(transaction),
                ...this.customerRepository.toPersistenceItem(customer),
              ]);
            } else {
              await this.transactionRepository.save(transaction);
              await this.customerRepository.save(customer);
            }
          } else {
            // Just save customer with updated phase
            await this.customerRepository.save(customer);
          }
        } catch (error) {
          result.errors.push(
            `Error processing customer ${customer.getCustomerId()}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      result.errors.push(
        `Fatal error in decay processing: ${error instanceof Error ? error.message : String(error)}`,
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
