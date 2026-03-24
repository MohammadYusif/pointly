import { NotFoundError, Points, Transaction } from '../../domain';
import { ValidationError } from '../../domain/errors/DomainError';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface ProcessReferralBonusRequest {
  refereeCustomerId: string;
  merchantId: string;
  idempotencyKey: string;
}

export interface ProcessReferralBonusResult {
  applied: boolean;
  referrerCustomerId?: string;
  refereeBonus?: number;
  referrerBonus?: number;
}

/**
 * ProcessReferralBonusUseCase
 *
 * Awards referral bonuses to both referee and referrer on the referee's first
 * purchase at a merchant. Both bonuses are merchant-scoped (merchantPointsBalance)
 * to avoid inflating the global currency.
 *
 * Runs fire-and-forget from RecordPurchaseUseCase after the main atomic write,
 * so failures here do not roll back the purchase.
 */
export class ProcessReferralBonusUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private merchantRepository: IMerchantRepository,
    private transactionRepository: ITransactionRepository,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  async execute(request: ProcessReferralBonusRequest): Promise<ProcessReferralBonusResult> {
    // Load referee to find their referral code
    const referee = await this.customerRepository.findById(request.refereeCustomerId);
    if (!referee) {
      throw new NotFoundError('Customer', request.refereeCustomerId);
    }

    const referredByCode = referee.getReferredBy();
    if (!referredByCode) {
      return { applied: false };
    }

    // Load merchant to check referral bonus config
    const merchant = await this.merchantRepository.findById(request.merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', request.merchantId);
    }

    const { forReferrer, forReferee } = merchant.getReferralConfig();
    if (forReferrer === 0 && forReferee === 0) {
      return { applied: false };
    }

    // Find the referrer by referral code
    const referrer = await this.customerRepository.findByReferralCode(referredByCode);
    if (!referrer) {
      // Referrer no longer exists — graceful no-op
      return { applied: false };
    }

    // Guard against self-referral
    if (referrer.getCustomerId() === referee.getCustomerId()) {
      return { applied: false };
    }

    // Guard: referrer must be enrolled with this merchant to receive merchant points
    const referrerEnrollment = referrer.getEnrollment(request.merchantId);
    if (!referrerEnrollment) {
      return { applied: false };
    }

    const items: PersistenceItem[] = [];

    // Award referee bonus (merchant-scoped)
    if (forReferee > 0) {
      const refereeBonus = Points.from(forReferee);
      const refereeBalanceBefore = referee.getMerchantPointsBalance(request.merchantId);
      referee.awardMerchantPoints(request.merchantId, refereeBonus);

      const refereeTx = Transaction.createAdjustment(
        request.merchantId,
        referee.getCustomerId(),
        refereeBonus,
        refereeBalanceBefore,
        true,
        `${request.idempotencyKey}_referee`,
        { source: 'referral_bonus_referee', referrerCode: referredByCode },
      );
      refereeTx.complete();
      items.push(...this.customerRepository.toPersistenceItem(referee));
      items.push(...this.transactionRepository.toPersistenceItem(refereeTx));
    }

    // Award referrer bonus (merchant-scoped)
    if (forReferrer > 0) {
      const referrerBonus = Points.from(forReferrer);
      const referrerBalanceBefore = referrer.getMerchantPointsBalance(request.merchantId);
      referrer.awardMerchantPoints(request.merchantId, referrerBonus);

      const referrerTx = Transaction.createAdjustment(
        request.merchantId,
        referrer.getCustomerId(),
        referrerBonus,
        referrerBalanceBefore,
        true,
        `${request.idempotencyKey}_referrer`,
        { source: 'referral_bonus_referrer', refereeId: referee.getCustomerId() },
      );
      referrerTx.complete();
      items.push(...this.customerRepository.toPersistenceItem(referrer));
      items.push(...this.transactionRepository.toPersistenceItem(referrerTx));
    }

    if (items.length > 0) {
      await this.atomicWrite(items);
    }

    return {
      applied: true,
      referrerCustomerId: referrer.getCustomerId(),
      ...(forReferee > 0 && { refereeBonus: forReferee }),
      ...(forReferrer > 0 && { referrerBonus: forReferrer }),
    };
  }
}

// Exported as a validation helper for tests
export function validateReferralRequest(forReferrer: number, forReferee: number): void {
  if (forReferrer < 0 || forReferee < 0) {
    throw new ValidationError('Referral bonus amounts cannot be negative');
  }
}
