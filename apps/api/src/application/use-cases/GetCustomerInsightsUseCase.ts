import type { Customer } from '../../domain/index.js';
import type { ICustomerRepository } from '../repositories/ICustomerRepository.js';

export interface CustomerInsightsResult {
  birthdayReward: { count: number };
  winBack: { count: number };
  welcomeOffer: { count: number };
  totalCustomers: number;
}

interface InsightThresholds {
  currentMonth: number;
  sixtyDaysAgo: Date;
  thirtyDaysAgo: Date;
}

interface InsightDeltas {
  birthday: number;
  winBack: number;
  welcomeOffer: number;
}

function countCustomerInsights(
  customer: Customer,
  merchantId: string,
  thresholds: InsightThresholds,
): InsightDeltas {
  const json = customer.toJSON();
  const deltas: InsightDeltas = { birthday: 0, winBack: 0, welcomeOffer: 0 };

  if (json.dateOfBirth && new Date(json.dateOfBirth).getMonth() === thresholds.currentMonth) {
    deltas.birthday = 1;
  }

  const enrollment = json.enrollments?.find((e) => e.merchantId === merchantId);
  if (!enrollment) return deltas;

  const lastTx = enrollment.lastTransactionAt ? new Date(enrollment.lastTransactionAt) : null;
  if (!lastTx || lastTx < thresholds.sixtyDaysAgo) deltas.winBack = 1;

  if (new Date(enrollment.enrolledAt) > thresholds.thirtyDaysAgo) deltas.welcomeOffer = 1;

  return deltas;
}

export class GetCustomerInsightsUseCase {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(merchantId: string): Promise<CustomerInsightsResult> {
    const now = new Date();
    const thresholds: InsightThresholds = {
      currentMonth: now.getMonth(),
      sixtyDaysAgo: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      thirtyDaysAgo: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    let birthdayCount = 0;
    let winBackCount = 0;
    let welcomeOfferCount = 0;
    let totalCustomers = 0;

    let nextToken: string | undefined;
    do {
      const result = await this.customerRepository.findByMerchant(merchantId, {
        limit: 500,
        ...(nextToken ? { nextToken } : {}),
      });

      for (const customer of result.items) {
        totalCustomers++;
        const deltas = countCustomerInsights(customer, merchantId, thresholds);
        birthdayCount += deltas.birthday;
        winBackCount += deltas.winBack;
        welcomeOfferCount += deltas.welcomeOffer;
      }

      nextToken = result.nextToken;
    } while (nextToken);

    return {
      birthdayReward: { count: birthdayCount },
      winBack: { count: winBackCount },
      welcomeOffer: { count: welcomeOfferCount },
      totalCustomers,
    };
  }
}
