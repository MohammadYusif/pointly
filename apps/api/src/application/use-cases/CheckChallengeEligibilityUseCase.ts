import { Money, NotFoundError, Points, Transaction } from '../../domain';
import { CustomerTierLevel } from '../../domain/config/TierConfig';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

const WEEKLY_VISIT_TARGET = 3;

/** Tier-aware streak bonus: higher tiers earn more to reward network engagement */
const STREAK_BONUS_BY_TIER: Record<CustomerTierLevel, number> = {
  [CustomerTierLevel.BRONZE]: 500,
  [CustomerTierLevel.GOLD]: 550,
  [CustomerTierLevel.PLATINUM]: 625,
  [CustomerTierLevel.DIAMOND]: 750,
};

export interface CheckChallengeEligibilityRequest {
  customerId: string;
  merchantId: string;
}

export interface CheckChallengeEligibilityResponse {
  streakCount: number;
  targetMet: boolean;
  bonusAwarded: boolean;
  bonusPoints?: number | undefined;
}

export class CheckChallengeEligibilityUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private transactionRepository: ITransactionRepository,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  async execute(
    request: CheckChallengeEligibilityRequest,
  ): Promise<CheckChallengeEligibilityResponse> {
    const customer = await this.customerRepository.findById(request.customerId);
    if (!customer) {
      throw new NotFoundError('Customer', request.customerId);
    }

    customer.recordVisitForStreak(new Date());

    const streakCount = customer.getWeeklyVisitCount();
    const targetMet = streakCount >= WEEKLY_VISIT_TARGET;

    if (targetMet && streakCount === WEEKLY_VISIT_TARGET) {
      const tierLevel = customer.getCurrentTier().getLevel() as CustomerTierLevel;
      const bonusAmount =
        STREAK_BONUS_BY_TIER[tierLevel] ?? STREAK_BONUS_BY_TIER[CustomerTierLevel.BRONZE];
      const bonusPoints = Points.from(bonusAmount);
      const balanceBefore = customer.getGlobalPointsBalance();
      customer.awardStreakBonus(bonusPoints);

      const bonusTransaction = Transaction.createEarn(
        'POINTLY_NETWORK',
        request.customerId,
        bonusPoints,
        Money.fromSAR(0),
        balanceBefore,
        `streak_bonus_${request.customerId}_${Date.now()}`,
        { source: 'weekly_streak_bonus' },
      );
      bonusTransaction.complete();

      await this.atomicWrite([
        ...this.customerRepository.toPersistenceItem(customer),
        ...this.transactionRepository.toPersistenceItem(bonusTransaction),
      ]);

      return { streakCount, targetMet: true, bonusAwarded: true, bonusPoints: bonusAmount };
    }

    await this.atomicWrite(this.customerRepository.toPersistenceItem(customer));

    return { streakCount, targetMet, bonusAwarded: false };
  }
}
