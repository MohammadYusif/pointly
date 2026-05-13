import { type Customer, Transaction } from '../../domain';
import { CustomerDecayService } from '../../domain/services/CustomerDecayService';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import type { IDecayCalculatorService } from '../services/IDecayCalculatorService';
import type { ISmsPublisherService } from '../services/ISmsPublisherService';
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
 * KSA Ministry of Commerce compliant — 12-month grace period:
 * - Months 0-11: Active (no decay) — engagement SMS at months 3, 6, 9
 * - Months 12-17: Light decay (5% per month)
 * - Months 18+: Heavy decay (15% per month)
 *
 * SMS is only sent during KSA legal hours (8:00 AM – 10:00 PM, UTC+3).
 * This should run as a Lambda on a monthly schedule (EventBridge).
 */
export class ProcessPointsDecayUseCase {
  private readonly customerDecayService = new CustomerDecayService();

  constructor(
    private customerRepository: ICustomerRepository,
    private transactionRepository: ITransactionRepository,
    private decayCalculator: IDecayCalculatorService,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
    private smsPublisher?: ISmsPublisherService,
  ) {}

  async execute(): Promise<DecayProcessingResult> {
    const result: DecayProcessingResult = {
      totalCustomersProcessed: 0,
      customersWithDecay: 0,
      totalPointsDecayed: 0,
      warningsSent: 0,
      errors: [],
    };

    const ksaHoursOk = this.isWithinKsaLegalHours();

    try {
      const customers = await this.getAllCustomers();

      const BATCH_SIZE = 25;
      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const batch = customers.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (customer) => {
            try {
              result.totalCustomersProcessed++;
              await this.processOneCustomer(customer, ksaHoursOk, result);
            } catch (error) {
              result.errors.push(
                `Error processing customer ${customer.getCustomerId()}: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }),
        );
      }
    } catch (error) {
      result.errors.push(
        `Fatal error in decay processing: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return result;
  }

  private async processOneCustomer(
    customer: Customer,
    ksaHoursOk: boolean,
    result: DecayProcessingResult,
  ): Promise<void> {
    customer.updateDecayPhase();
    await this.maybeSendEngagementSms(customer, ksaHoursOk, result);
    await this.maybeSendDecayWarningSms(customer, ksaHoursOk, result);
    await this.applyDecay(customer, result);
  }

  /** Proactive engagement SMS at 3/6/9 months of inactivity (during grace period). */
  private async maybeSendEngagementSms(
    customer: Customer,
    ksaHoursOk: boolean,
    result: DecayProcessingResult,
  ): Promise<void> {
    if (!this.smsPublisher || !ksaHoursOk) return;
    const milestone = this.decayCalculator.getInactivityMilestone(customer);
    if (!milestone) return;

    const monthsLeft = 12 - milestone;
    const balance = customer.getGlobalPointsBalance().toNumber();
    await this.smsPublisher.publish({
      phone: customer.getPhone().toE164(),
      body: `[Pointly] You have ${balance} points. ${monthsLeft} months until inactivity expiry — shop now to keep them! | لديك ${balance} نقطة. ${monthsLeft} أشهر حتى انتهاء صلاحية النقاط بسبب عدم النشاط — تسوق الآن للحفاظ عليها!`,
      merchantId: 'SYSTEM',
      type: 'DECAY_WARNING',
    });
    customer.markInactivityWarningSent();
    result.warningsSent++;
  }

  /** Phase-1 decay warning SMS (months 12-17, decay has started). */
  private async maybeSendDecayWarningSms(
    customer: Customer,
    ksaHoursOk: boolean,
    result: DecayProcessingResult,
  ): Promise<void> {
    if (!this.smsPublisher || !ksaHoursOk) return;
    if (!this.decayCalculator.shouldWarnCustomer(customer)) return;

    const warning = this.decayCalculator.generateWarningMessage(customer);
    if (!warning) return;

    await this.smsPublisher.publish({
      phone: warning.phone,
      body: warning.message,
      merchantId: 'SYSTEM',
      type: 'DECAY_WARNING',
    });
    result.warningsSent++;
  }

  /** Apply decay to the customer and persist. No-op (profile-only save) when no decay occurs. */
  private async applyDecay(customer: Customer, result: DecayProcessingResult): Promise<void> {
    const balanceBeforeDecay = customer.getGlobalPointsBalance();
    const decayAmount = this.customerDecayService.applyMonthlyDecay(customer);

    if (decayAmount.isZero()) {
      await this.customerRepository.save(customer);
      return;
    }

    result.customersWithDecay++;
    result.totalPointsDecayed += decayAmount.toNumber();

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

    await this.atomicWrite([
      ...this.transactionRepository.toPersistenceItem(transaction),
      ...this.customerRepository.toPersistenceItem(customer),
    ]);
  }

  /**
   * Returns true if the current time is within KSA legal SMS hours.
   * KSA is UTC+3. Legal hours: 8:00 AM – 10:00 PM.
   */
  private isWithinKsaLegalHours(): boolean {
    const h = (new Date().getUTCHours() + 3) % 24;
    return h >= 8 && h < 22;
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
