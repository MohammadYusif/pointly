import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import { GetCustomerInsightsUseCase } from '../use-cases/GetCustomerInsightsUseCase';

const MERCHANT_ID = 'merchant_insights_1';

function makeCustomerMock(overrides?: {
  dateOfBirth?: string;
  enrolledAt?: string;
  lastTransactionAt?: string | null;
  hasEnrollment?: boolean;
}): Customer {
  const now = new Date();
  const enrolledAt =
    overrides?.enrolledAt ?? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const enrollment =
    overrides?.hasEnrollment === false
      ? undefined
      : {
          merchantId: MERCHANT_ID,
          enrolledAt,
          lastTransactionAt:
            overrides?.lastTransactionAt === null
              ? undefined
              : (overrides?.lastTransactionAt ??
                new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()),
          merchantPointsBalance: 0,
          merchantLifetimePoints: 0,
          transactionCount: 0,
        };

  return {
    toJSON: vi.fn().mockReturnValue({
      customerId: 'customer_1',
      phone: '+966501234567',
      name: 'Test Customer',
      status: 'ACTIVE',
      dateOfBirth: overrides?.dateOfBirth,
      enrollments: enrollment ? [enrollment] : [],
    }),
  } as unknown as Customer;
}

describe('GetCustomerInsightsUseCase', () => {
  let useCase: GetCustomerInsightsUseCase;
  let mockCustomerRepo: ICustomerRepository;

  beforeEach(() => {
    mockCustomerRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findByPhone: vi.fn(),
      findByMerchant: vi.fn().mockResolvedValue({ items: [], count: 0, nextToken: undefined }),
      findAll: vi.fn(),
      isEnrolled: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock returns empty persistence items
      toPersistenceItem: vi.fn().mockReturnValue([]) as any,
      // biome-ignore lint/suspicious/noExplicitAny: test mock returns empty persistence items
      toEnrollmentItems: vi.fn().mockReturnValue([]) as any,
    };

    useCase = new GetCustomerInsightsUseCase(mockCustomerRepo);
  });

  describe('empty merchant', () => {
    it('returns all counts as zero when no customers exist', async () => {
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: [],
        count: 0,
        nextToken: undefined,
      });

      const result = await useCase.execute(MERCHANT_ID);

      expect(result.birthdayReward.count).toBe(0);
      expect(result.winBack.count).toBe(0);
      expect(result.welcomeOffer.count).toBe(0);
      expect(result.totalCustomers).toBe(0);
    });
  });

  describe('totalCustomers', () => {
    it('matches the total number of customers returned by the repo', async () => {
      const customers = [makeCustomerMock(), makeCustomerMock(), makeCustomerMock()];
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: customers,
        count: 3,
        nextToken: undefined,
      });

      const result = await useCase.execute(MERCHANT_ID);

      expect(result.totalCustomers).toBe(3);
    });
  });

  describe('birthdayCount', () => {
    it('counts customers whose dateOfBirth month matches the current month', async () => {
      const now = new Date();
      const birthdayThisMonth = new Date(2000, now.getMonth(), 15).toISOString().slice(0, 10);
      const birthdayOtherMonth = new Date(2000, (now.getMonth() + 1) % 12, 15)
        .toISOString()
        .slice(0, 10);

      const customers = [
        makeCustomerMock({ dateOfBirth: birthdayThisMonth }),
        makeCustomerMock({ dateOfBirth: birthdayThisMonth }),
        makeCustomerMock({ dateOfBirth: birthdayOtherMonth }),
        makeCustomerMock(),
      ];
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: customers,
        count: 4,
        nextToken: undefined,
      });

      const result = await useCase.execute(MERCHANT_ID);

      expect(result.birthdayReward.count).toBe(2);
    });

    it('does not count customers without a dateOfBirth', async () => {
      const customers = [makeCustomerMock(), makeCustomerMock()];
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: customers,
        count: 2,
        nextToken: undefined,
      });

      const result = await useCase.execute(MERCHANT_ID);

      expect(result.birthdayReward.count).toBe(0);
    });
  });

  describe('winBackCount', () => {
    it('counts customers whose last transaction was more than 60 days ago', async () => {
      const now = new Date();
      const oldTx = new Date(now.getTime() - 61 * 24 * 60 * 60 * 1000).toISOString();
      const recentTx = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

      const customers = [
        makeCustomerMock({ lastTransactionAt: oldTx }),
        makeCustomerMock({ lastTransactionAt: oldTx }),
        makeCustomerMock({ lastTransactionAt: recentTx }),
      ];
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: customers,
        count: 3,
        nextToken: undefined,
      });

      const result = await useCase.execute(MERCHANT_ID);

      expect(result.winBack.count).toBe(2);
    });

    it('counts customers who have never transacted (no lastTransactionAt)', async () => {
      const customers = [
        makeCustomerMock({ lastTransactionAt: null }),
        makeCustomerMock({ lastTransactionAt: null }),
      ];
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: customers,
        count: 2,
        nextToken: undefined,
      });

      const result = await useCase.execute(MERCHANT_ID);

      expect(result.winBack.count).toBe(2);
    });
  });

  describe('welcomeOfferCount', () => {
    it('counts customers enrolled less than 30 days ago', async () => {
      const now = new Date();
      const recentEnrollment = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const oldEnrollment = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();

      const customers = [
        makeCustomerMock({ enrolledAt: recentEnrollment }),
        makeCustomerMock({ enrolledAt: recentEnrollment }),
        makeCustomerMock({ enrolledAt: oldEnrollment }),
      ];
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: customers,
        count: 3,
        nextToken: undefined,
      });

      const result = await useCase.execute(MERCHANT_ID);

      expect(result.welcomeOffer.count).toBe(2);
    });
  });

  describe('overlapping buckets', () => {
    it('counts a customer in multiple buckets when they qualify for all three', async () => {
      const now = new Date();
      const birthdayThisMonth = new Date(2000, now.getMonth(), 15).toISOString().slice(0, 10);
      const recentEnrollment = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

      const customer = makeCustomerMock({
        dateOfBirth: birthdayThisMonth,
        enrolledAt: recentEnrollment,
        lastTransactionAt: null,
      });
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: [customer],
        count: 1,
        nextToken: undefined,
      });

      const result = await useCase.execute(MERCHANT_ID);

      expect(result.birthdayReward.count).toBe(1);
      expect(result.winBack.count).toBe(1);
      expect(result.welcomeOffer.count).toBe(1);
      expect(result.totalCustomers).toBe(1);
    });
  });

  describe('pagination', () => {
    it('fetches all pages when findByMerchant returns a nextToken', async () => {
      const page1Customer = makeCustomerMock({ lastTransactionAt: null });
      const page2Customer = makeCustomerMock({ lastTransactionAt: null });

      vi.mocked(mockCustomerRepo.findByMerchant)
        .mockResolvedValueOnce({
          items: [page1Customer],
          count: 1,
          nextToken: 'token_page2',
        })
        .mockResolvedValueOnce({
          items: [page2Customer],
          count: 1,
          nextToken: undefined,
        });

      const result = await useCase.execute(MERCHANT_ID);

      expect(mockCustomerRepo.findByMerchant).toHaveBeenCalledTimes(2);
      expect(mockCustomerRepo.findByMerchant).toHaveBeenNthCalledWith(1, MERCHANT_ID, {
        limit: 500,
      });
      expect(mockCustomerRepo.findByMerchant).toHaveBeenNthCalledWith(2, MERCHANT_ID, {
        limit: 500,
        nextToken: 'token_page2',
      });
      expect(result.totalCustomers).toBe(2);
      expect(result.winBack.count).toBe(2);
    });
  });

  describe('enrollment filtering', () => {
    it('skips win-back and welcome counting for customers without an enrollment for this merchant', async () => {
      const customer = makeCustomerMock({ hasEnrollment: false });
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: [customer],
        count: 1,
        nextToken: undefined,
      });

      const result = await useCase.execute(MERCHANT_ID);

      expect(result.winBack.count).toBe(0);
      expect(result.welcomeOffer.count).toBe(0);
      expect(result.totalCustomers).toBe(1);
    });
  });
});
