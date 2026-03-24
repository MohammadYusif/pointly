import type { Customer } from '../../domain';
import { MerchantPointsExpiryService } from '../../domain/services/MerchantPointsExpiryService';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';

export interface MerchantExpiryResult {
  customersProcessed: number;
  enrollmentsExpired: number;
  errors: string[];
}

/**
 * ProcessMerchantPointsExpiryUseCase
 *
 * Scheduled use case that pages through all customers and zeroes out merchant
 * point balances where the merchant has opted into a configurable expiry window
 * and the customer's last activity exceeds that window.
 *
 * KSA Ministry of Commerce compliance: merchantPointsExpiryDays >= 365 is
 * enforced at the Merchant domain level. This use case only operates on
 * merchants that have explicitly opted in.
 *
 * Run after ProcessPointsDecayUseCase in scheduled-decay.ts.
 */
export class ProcessMerchantPointsExpiryUseCase {
  private readonly expiryService = new MerchantPointsExpiryService();

  constructor(
    private customerRepository: ICustomerRepository,
    private merchantRepository: IMerchantRepository,
  ) {}

  async execute(): Promise<MerchantExpiryResult> {
    const result: MerchantExpiryResult = {
      customersProcessed: 0,
      enrollmentsExpired: 0,
      errors: [],
    };

    // Build a map of merchantId → expiryDays for merchants that opted in
    const merchantExpiryMap = await this.buildMerchantExpiryMap();
    if (merchantExpiryMap.size === 0) {
      return result; // No merchants opted in — nothing to do
    }

    const allCustomers = await this.getAllCustomers();

    for (const customer of allCustomers) {
      try {
        result.customersProcessed++;
        const expired = this.expiryService.getExpiredMerchantIds(customer, merchantExpiryMap);
        if (expired.length > 0) {
          this.expiryService.applyExpiry(customer, expired);
          await this.customerRepository.save(customer);
          result.enrollmentsExpired += expired.length;
        }
      } catch (error) {
        result.errors.push(
          `Error processing customer ${customer.getCustomerId()}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return result;
  }

  private async buildMerchantExpiryMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    let nextToken: string | undefined;
    do {
      const result = await this.merchantRepository.findVerified({
        limit: 100,
        ...(nextToken ? { nextToken } : {}),
      });
      for (const merchant of result.items) {
        const days = merchant.getMerchantPointsExpiryDays();
        if (days !== undefined) {
          map.set(merchant.getMerchantId(), days);
        }
      }
      nextToken = result.nextToken;
    } while (nextToken);
    return map;
  }

  private async getAllCustomers(): Promise<Customer[]> {
    const all: Customer[] = [];
    let nextToken: string | undefined;
    do {
      const result = await this.customerRepository.findAll({
        limit: 100,
        ...(nextToken ? { nextToken } : {}),
      });
      all.push(...result.items);
      nextToken = result.nextToken;
    } while (nextToken);
    return all;
  }
}
