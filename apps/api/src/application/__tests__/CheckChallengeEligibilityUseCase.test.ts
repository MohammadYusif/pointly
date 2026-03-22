import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Customer, NotFoundError, PhoneNumber } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import { CheckChallengeEligibilityUseCase } from '../use-cases/CheckChallengeEligibilityUseCase';

describe('CheckChallengeEligibilityUseCase', () => {
  let useCase: CheckChallengeEligibilityUseCase;
  let mockCustomerRepo: ICustomerRepository;
  let mockTransactionRepo: ITransactionRepository;
  let mockAtomicWrite: ReturnType<typeof vi.fn>;

  let testCustomer: Customer;

  const customerId = 'customer_123';
  const merchantId = 'merchant_123';

  beforeEach(() => {
    testCustomer = Customer.create(new PhoneNumber('0501234567'), 'Ahmed');

    mockAtomicWrite = vi.fn().mockResolvedValue(undefined);

    mockCustomerRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findByPhone: vi.fn(),
      findByMerchant: vi.fn(),
      isEnrolled: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock returns empty persistence items
      toPersistenceItem: vi.fn().mockReturnValue([]) as any,
    };

    mockTransactionRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findByCustomer: vi.fn(),
      findByMerchant: vi.fn(),
      findByCustomerAndMerchant: vi.fn(),
      getMerchantStats: vi.fn(),
      getCustomerStats: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock returns empty persistence items
      toPersistenceItem: vi.fn().mockReturnValue([]) as any,
    };

    useCase = new CheckChallengeEligibilityUseCase(
      mockCustomerRepo,
      mockTransactionRepo,
      mockAtomicWrite,
    );
  });

  it('should throw NotFoundError if customer does not exist', async () => {
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute({ customerId, merchantId })).rejects.toThrow(NotFoundError);
  });

  it('should record a visit and return streakCount=1 with targetMet=false and bonusAwarded=false', async () => {
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

    const result = await useCase.execute({ customerId, merchantId });

    expect(result.streakCount).toBe(1);
    expect(result.targetMet).toBe(false);
    expect(result.bonusAwarded).toBe(false);
    expect(mockAtomicWrite).toHaveBeenCalledTimes(1);
  });

  it('should not award bonus when streak is below target', async () => {
    // Simulate 2 prior visits on different days
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    testCustomer.recordVisitForStreak(yesterday);

    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

    const result = await useCase.execute({ customerId, merchantId });

    expect(result.streakCount).toBe(2);
    expect(result.targetMet).toBe(false);
    expect(result.bonusAwarded).toBe(false);
    expect(mockAtomicWrite).toHaveBeenCalledTimes(1);
  });

  it('should award bonus and create a transaction when weekly target is first reached', async () => {
    // Simulate 2 prior visits on different days
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    testCustomer.recordVisitForStreak(twoDaysAgo);
    testCustomer.recordVisitForStreak(yesterday);

    const balanceBefore = testCustomer.getGlobalPointsBalance().toNumber();

    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

    const result = await useCase.execute({ customerId, merchantId });

    expect(result.streakCount).toBe(3);
    expect(result.targetMet).toBe(true);
    expect(result.bonusAwarded).toBe(true);
    expect(mockAtomicWrite).toHaveBeenCalledTimes(1);

    // Customer balance should be boosted by 500
    expect(testCustomer.getGlobalPointsBalance().toNumber()).toBe(balanceBefore + 500);

    // Both customer and transaction should be saved
    expect(vi.mocked(mockCustomerRepo.toPersistenceItem)).toHaveBeenCalledWith(testCustomer);
    expect(vi.mocked(mockTransactionRepo.toPersistenceItem)).toHaveBeenCalledTimes(1);
  });

  describe('Idempotency key for streak bonus (V7 fix)', () => {
    /** Simulate 2 prior visits so the 3rd call triggers the bonus. */
    function setupTwoVisits() {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      testCustomer.recordVisitForStreak(twoDaysAgo);
      testCustomer.recordVisitForStreak(yesterday);
    }

    it('uses ISO week-start date (YYYY-MM-DD of Monday) as part of the bonus key', async () => {
      // Pin to a known Wednesday so Monday = 2026-03-23
      vi.setSystemTime(new Date('2026-03-25T10:00:00Z')); // Wednesday
      setupTwoVisits();
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      // Capture the transaction passed to toPersistenceItem
      let capturedTransaction: import('../../domain').Transaction | undefined;
      vi.mocked(mockTransactionRepo.toPersistenceItem).mockImplementation(
        (tx: import('../../domain').Transaction) => {
          capturedTransaction = tx;
          return [];
        },
      );

      await useCase.execute({ customerId, merchantId });

      expect(capturedTransaction).toBeDefined();
      const key = capturedTransaction?.getIdempotencyKey();
      expect(key).toContain('streak_bonus_');
      // Must use week-start Monday (2026-03-23), NOT a timestamp
      expect(key).toContain('2026-03-23'); // 2026-03-25 is Wed; Monday of that week is 2026-03-23
      expect(key).not.toMatch(/\d{13}/); // must not contain a 13-digit ms timestamp

      vi.useRealTimers();
    });

    it('two calls within the same week produce the same idempotency key', async () => {
      // Pin to Monday
      vi.setSystemTime(new Date('2026-03-23T09:00:00Z'));
      setupTwoVisits();
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      const keys: string[] = [];
      vi.mocked(mockTransactionRepo.toPersistenceItem).mockImplementation(
        (tx: import('../../domain').Transaction) => {
          keys.push(tx.getIdempotencyKey());
          return [];
        },
      );

      // First call: earns bonus (3rd visit)
      await useCase.execute({ customerId, merchantId });

      // Re-create customer at 3-visit state and call again (same week)
      const customer2 = Customer.create(new PhoneNumber('0501234567'), 'Ahmed');
      const twoDaysAgo = new Date('2026-03-21T09:00:00Z');
      const yesterday = new Date('2026-03-22T09:00:00Z');
      customer2.recordVisitForStreak(twoDaysAgo);
      customer2.recordVisitForStreak(yesterday);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(customer2);

      await useCase.execute({ customerId, merchantId });

      // Both bonus transactions must have the same idempotency key
      expect(keys).toHaveLength(2);
      expect(keys[0]).toBe(keys[1]);

      vi.useRealTimers();
    });

    it('different weeks produce different idempotency keys', async () => {
      const keys: string[] = [];
      vi.mocked(mockTransactionRepo.toPersistenceItem).mockImplementation(
        (tx: import('../../domain').Transaction) => {
          keys.push(tx.getIdempotencyKey());
          return [];
        },
      );

      // Week 1 — Monday 2026-03-23
      vi.setSystemTime(new Date('2026-03-23T09:00:00Z'));
      setupTwoVisits();
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);
      await useCase.execute({ customerId, merchantId });

      // Week 2 — Monday 2026-03-30
      vi.setSystemTime(new Date('2026-03-30T09:00:00Z'));
      const customer2 = Customer.create(new PhoneNumber('0501234567'), 'Ahmed');
      const twoDaysAgo = new Date('2026-03-28T09:00:00Z');
      const yesterday = new Date('2026-03-29T09:00:00Z');
      customer2.recordVisitForStreak(twoDaysAgo);
      customer2.recordVisitForStreak(yesterday);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(customer2);
      await useCase.execute({ customerId, merchantId });

      expect(keys).toHaveLength(2);
      expect(keys[0]).not.toBe(keys[1]);

      vi.useRealTimers();
    });
  });

  it('should not award bonus again on a 4th visit within the same week', async () => {
    // Set up 3 prior visits on different days (already met target)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    testCustomer.recordVisitForStreak(threeDaysAgo);
    testCustomer.recordVisitForStreak(twoDaysAgo);
    testCustomer.recordVisitForStreak(yesterday);

    expect(testCustomer.getWeeklyVisitCount()).toBe(3);

    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

    const result = await useCase.execute({ customerId, merchantId });

    expect(result.streakCount).toBe(4);
    expect(result.targetMet).toBe(true);
    expect(result.bonusAwarded).toBe(false); // Already past 3, no bonus
    expect(mockAtomicWrite).toHaveBeenCalledTimes(1);
  });
});
