import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Customer,
  Email,
  Merchant,
  MerchantTier,
  NotFoundError,
  PhoneNumber,
  Points,
  UnauthorizedError,
  ValidationError,
} from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import type { IIdempotencyService } from '../services/IIdempotencyService';
import { RedeemPointsUseCase } from '../use-cases/RedeemPointsUseCase';

describe('RedeemPointsUseCase', () => {
  let useCase: RedeemPointsUseCase;
  let mockCustomerRepo: ICustomerRepository;
  let mockMerchantRepo: IMerchantRepository;
  let mockTransactionRepo: ITransactionRepository;
  let mockIdempotencyService: IIdempotencyService;

  let testCustomer: Customer;
  let testMerchant: Merchant;

  const merchantId = 'merchant_123';

  beforeEach(() => {
    const phone = new PhoneNumber('0501234567');
    testCustomer = Customer.create(phone, 'Ahmed Al-Saud');
    testCustomer.enrollWithMerchant(merchantId);
    testCustomer.grantConsent(merchantId);

    const email = new Email('merchant@example.com');
    const merchantPhone = new PhoneNumber('0509876543');
    testMerchant = Merchant.create(
      'Test Store',
      email,
      merchantPhone,
      'Merchant Owner',
      MerchantTier.PROFESSIONAL,
    );
    testMerchant.verify();

    mockCustomerRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findByPhone: vi.fn(),
      findByMerchant: vi.fn(),
      findPendingConsents: vi.fn(),
      isEnrolled: vi.fn(),
    };

    mockMerchantRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findByEmail: vi.fn(),
      findByPhone: vi.fn(),
      findVerified: vi.fn(),
      findPendingVerification: vi.fn(),
      findByTier: vi.fn(),
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
    };

    mockIdempotencyService = {
      getResult: vi.fn(),
      storeResult: vi.fn(),
      delete: vi.fn(),
    };

    useCase = new RedeemPointsUseCase(
      mockCustomerRepo,
      mockMerchantRepo,
      mockTransactionRepo,
      mockIdempotencyService,
    );
  });

  function giveCustomerPoints(globalPoints: number, merchantPoints: number) {
    testCustomer.addPointsFromPurchase(
      merchantId,
      Points.from(globalPoints),
      Points.from(merchantPoints),
    );
  }

  function setupMocks() {
    vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
    vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);
  }

  describe('Basic Redemption', () => {
    it('should redeem points from merchant wallet only when sufficient', async () => {
      giveCustomerPoints(100, 200);
      setupMocks();

      const result = await useCase.execute({
        merchantId,
        customerId: testCustomer.getCustomerId(),
        pointsToRedeem: 100,
        idempotencyKey: 'redeem_1',
      });

      expect(result.totalPointsRedeemed).toBe(100);
      expect(result.merchantPointsRedeemed).toBe(100);
      expect(result.globalPointsRedeemed).toBe(0);
      expect(result.transactionIds).toHaveLength(1);
      expect(result.sarValue).toBe(1); // 100 * 0.01
      expect(vi.mocked(mockTransactionRepo.save)).toHaveBeenCalledTimes(1);
    });

    it('should use merchant points first then global (smart redeem)', async () => {
      giveCustomerPoints(500, 200);
      setupMocks();

      const result = await useCase.execute({
        merchantId,
        customerId: testCustomer.getCustomerId(),
        pointsToRedeem: 300,
        idempotencyKey: 'redeem_2',
      });

      expect(result.merchantPointsRedeemed).toBe(200);
      expect(result.globalPointsRedeemed).toBe(100);
      expect(result.totalPointsRedeemed).toBe(300);
      expect(result.transactionIds).toHaveLength(2);
      expect(vi.mocked(mockTransactionRepo.save)).toHaveBeenCalledTimes(2);
    });

    it('should calculate correct SAR value based on redemption rate', async () => {
      giveCustomerPoints(500, 500);
      setupMocks();

      const result = await useCase.execute({
        merchantId,
        customerId: testCustomer.getCustomerId(),
        pointsToRedeem: 200,
        idempotencyKey: 'redeem_3',
      });

      // PROFESSIONAL tier: redemptionRate = 0.01
      expect(result.sarValue).toBe(2); // 200 * 0.01
    });
  });

  describe('Idempotency', () => {
    it('should return cached result on duplicate idempotency key', async () => {
      const cachedResult = {
        transactionIds: ['tx_cached'],
        merchantPointsRedeemed: 100,
        globalPointsRedeemed: 0,
        totalPointsRedeemed: 100,
        sarValue: 1,
        newMerchantBalance: 0,
        newGlobalBalance: 500,
        currentTier: 'Bronze',
        message: 'Redeemed 100 points for 1.00 SAR',
      };
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(cachedResult);

      const result = await useCase.execute({
        merchantId,
        customerId: testCustomer.getCustomerId(),
        pointsToRedeem: 100,
        idempotencyKey: 'duplicate_key',
      });

      expect(result).toEqual(cachedResult);
      expect(vi.mocked(mockMerchantRepo.findById)).not.toHaveBeenCalled();
    });
  });

  describe('Validation Errors', () => {
    it('should throw on insufficient points', async () => {
      giveCustomerPoints(50, 30);
      setupMocks();

      await expect(
        useCase.execute({
          merchantId,
          customerId: testCustomer.getCustomerId(),
          pointsToRedeem: 200,
          idempotencyKey: 'redeem_err_1',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw on below minimum redemption', async () => {
      giveCustomerPoints(500, 500);
      setupMocks();

      // PROFESSIONAL minimum is 50
      await expect(
        useCase.execute({
          merchantId,
          customerId: testCustomer.getCustomerId(),
          pointsToRedeem: 10,
          idempotencyKey: 'redeem_err_2',
        }),
      ).rejects.toThrow('Minimum redemption is 50 points');
    });

    it('should throw on inactive customer', async () => {
      giveCustomerPoints(500, 500);
      testCustomer.deactivate();
      setupMocks();

      await expect(
        useCase.execute({
          merchantId,
          customerId: testCustomer.getCustomerId(),
          pointsToRedeem: 100,
          idempotencyKey: 'redeem_err_3',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw on unverified merchant', async () => {
      const unverifiedMerchant = Merchant.create(
        'Unverified Store',
        new Email('unverified@test.com'),
        new PhoneNumber('0511111111'),
        'Owner',
        MerchantTier.BASIC,
      );

      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(unverifiedMerchant);

      await expect(
        useCase.execute({
          merchantId,
          customerId: testCustomer.getCustomerId(),
          pointsToRedeem: 100,
          idempotencyKey: 'redeem_err_4',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw on merchant not found', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({
          merchantId: 'nonexistent',
          customerId: testCustomer.getCustomerId(),
          pointsToRedeem: 100,
          idempotencyKey: 'redeem_err_5',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw on customer not found', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({
          merchantId,
          customerId: 'nonexistent',
          pointsToRedeem: 100,
          idempotencyKey: 'redeem_err_6',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should enforce exact multiple when partial redemption is disabled', async () => {
      // Create a merchant with allowPartialRedemption explicitly disabled
      const basicMerchant = Merchant.create(
        'Basic Store',
        new Email('basic@test.com'),
        new PhoneNumber('0522222222'),
        'Owner',
        MerchantTier.BASIC,
      );
      basicMerchant.verify();
      basicMerchant.updateLoyaltyConfig({ allowPartialRedemption: false });

      testCustomer = Customer.create(new PhoneNumber('0533333333'), 'Test User');
      testCustomer.enrollWithMerchant(merchantId);
      testCustomer.grantConsent(merchantId);
      testCustomer.addPointsFromPurchase(merchantId, Points.from(500), Points.from(500));

      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(basicMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      await expect(
        useCase.execute({
          merchantId,
          customerId: testCustomer.getCustomerId(),
          pointsToRedeem: 150,
          idempotencyKey: 'redeem_err_7',
        }),
      ).rejects.toThrow('partial redemption not allowed');
    });
  });

  describe('Repository Interactions', () => {
    it('should save customer, merchant, and idempotency result', async () => {
      giveCustomerPoints(500, 500);
      setupMocks();

      await useCase.execute({
        merchantId,
        customerId: testCustomer.getCustomerId(),
        pointsToRedeem: 100,
        idempotencyKey: 'redeem_save_1',
      });

      expect(vi.mocked(mockCustomerRepo.save)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(mockMerchantRepo.save)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(mockIdempotencyService.storeResult)).toHaveBeenCalledTimes(1);
    });
  });
});
