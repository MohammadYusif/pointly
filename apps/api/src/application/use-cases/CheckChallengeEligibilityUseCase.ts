import { Money, NotFoundError, Points, Transaction } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

const WEEKLY_VISIT_TARGET = 3;
const STREAK_BONUS_POINTS = 500;

export interface CheckChallengeEligibilityRequest {
  customerId: string;
  merchantId: string;
}

export interface CheckChallengeEligibilityResponse {
  streakCount: number;
  targetMet: boolean;
  bonusAwarded: boolean;
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
      const bonusPoints = Points.from(STREAK_BONUS_POINTS);
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

      return { streakCount, targetMet: true, bonusAwarded: true };
    }

    await this.atomicWrite(this.customerRepository.toPersistenceItem(customer));

    return { streakCount, targetMet, bonusAwarded: false };
  }
}
