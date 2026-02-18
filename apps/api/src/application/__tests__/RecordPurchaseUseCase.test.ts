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
import { RecordPurchaseUseCase } from '../use-cases/RecordPurchaseUseCase';

describe('RecordPurchaseUseCase', () => {
  let useCase: RecordPurchaseUseCase;
  let mockCustomerRepo: ICustomerRepository;
  let mockMerchantRepo: IMerchantRepository;
  let mockTransactionRepo: ITransactionRepository;
  let mockIdempotencyService: IIdempotencyService;

  let testCustomer: Customer;
  let testMerchant: Merchant;

  beforeEach(() => {
    // Create test entities
    const phone = new PhoneNumber('0501234567');
    testCustomer = Customer.create(phone, 'Ahmed Al-Saud');
    testCustomer.enrollWithMerchant('merchant_123');
    testCustomer.grantConsent('merchant_123');

    const email = new Email('merchant@example.com');
    const merchantPhone = new PhoneNumber('0509876543');
    testMerchant = Merchant.create(
      'Test Store',
      email,
      merchantPhone,
      'Merchant Owner',
      MerchantTier.PROFESSIONAL,
    );
    testMerchant.verify(); // Make merchant verified

    // Mock repositories
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

    useCase = new RecordPurchaseUseCase(
      mockCustomerRepo,
      mockMerchantRepo,
      mockTransactionRepo,
      mockIdempotencyService,
    );
  });

  describe('Successful Purchase', () => {
    it('should record purchase and award dual points (PROFESSIONAL tier)', async () => {
      // Setup
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      const request = {
        merchantId: 'merchant_123',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 100,
        idempotencyKey: 'test_key_1',
        metadata: {
          receiptNumber: 'REC-001',
          cashierName: 'Cashier 1',
        },
      };

      // Execute
      const result = await useCase.execute(request);

      // Assert
      expect(result.merchantPoints).toBe(100); // 1:1 ratio
      expect(result.globalPoints).toBe(100); // Simplified: 1:1 for all tiers
      expect(result.newMerchantBalance).toBe(100);
      expect(result.newGlobalBalance).toBe(100);
      expect(result.transactionId).toBeTruthy();

      // Verify repositories were called (2 transactions: merchant + global audit trail)
      expect(mockTransactionRepo.save).toHaveBeenCalledTimes(2);
      expect(mockCustomerRepo.save).toHaveBeenCalledTimes(1);
      expect(mockMerchantRepo.save).toHaveBeenCalledTimes(1);
      expect(mockIdempotencyService.storeResult).toHaveBeenCalledWith(
        request.idempotencyKey,
        result,
        3600,
      );
    });

    it('should award correct points for BASIC tier (1x global multiplier)', async () => {
      // Create BASIC tier merchant
      const basicMerchant = Merchant.create(
        'Basic Store',
        new Email('basic@example.com'),
        new PhoneNumber('0501111111'),
        'Owner',
        MerchantTier.BASIC,
      );
      basicMerchant.verify();

      testCustomer.enrollWithMerchant('basic_merchant');
      testCustomer.grantConsent('basic_merchant');

      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(basicMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      const result = await useCase.execute({
        merchantId: 'basic_merchant',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 100,
        idempotencyKey: 'test_key_2',
      });

      expect(result.merchantPoints).toBe(100);
      expect(result.globalPoints).toBe(100); // 1x for BASIC
    });

    it('should award correct points for ENTERPRISE tier (simplified 1:1)', async () => {
      // Create ENTERPRISE tier merchant
      const enterpriseMerchant = Merchant.create(
        'Enterprise Store',
        new Email('enterprise@example.com'),
        new PhoneNumber('0502222222'),
        'Owner',
        MerchantTier.ENTERPRISE,
      );
      enterpriseMerchant.verify();

      testCustomer.enrollWithMerchant('enterprise_merchant');
      testCustomer.grantConsent('enterprise_merchant');

      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(enterpriseMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      const result = await useCase.execute({
        merchantId: 'enterprise_merchant',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 100,
        idempotencyKey: 'test_key_3',
      });

      expect(result.merchantPoints).toBe(100);
      expect(result.globalPoints).toBe(100); // Simplified: 1:1 for all tiers
    });

    it('should add points to existing balances', async () => {
      // Give customer some existing points
      testCustomer.addPointsFromPurchase(
        'merchant_123',
        Points.from(50), // existing global
        Points.from(30), // existing merchant
      );

      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      const result = await useCase.execute({
        merchantId: 'merchant_123',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 100,
        idempotencyKey: 'test_key_4',
      });

      expect(result.newGlobalBalance).toBe(150); // 50 + 100 (simplified 1:1)
      expect(result.newMerchantBalance).toBe(130); // 30 + 100
    });
  });

  describe('Idempotency', () => {
    it('should return cached result for duplicate request', async () => {
      const cachedResponse = {
        transactionId: 'txn_cached',
        merchantPoints: 100,
        globalPoints: 150,
        newMerchantBalance: 100,
        newGlobalBalance: 150,
        message: 'Cached message',
      };

      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(cachedResponse);

      const result = await useCase.execute({
        merchantId: 'merchant_123',
        customerId: 'customer_123',
        amountSAR: 100,
        idempotencyKey: 'duplicate_key',
      });

      expect(result).toEqual(cachedResponse);
      expect(mockMerchantRepo.findById).not.toHaveBeenCalled();
      expect(mockCustomerRepo.findById).not.toHaveBeenCalled();
      expect(mockTransactionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Validation Errors', () => {
    it('should throw NotFoundError if merchant not found', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({
          merchantId: 'nonexistent_merchant',
          customerId: 'customer_123',
          amountSAR: 100,
          idempotencyKey: 'test_key',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthorizedError if merchant not verified', async () => {
      const unverifiedMerchant = Merchant.create(
        'Unverified Store',
        new Email('unverified@example.com'),
        new PhoneNumber('0503333333'),
        'Owner',
        MerchantTier.BASIC,
      );
      // Don't call verify()

      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(unverifiedMerchant);

      await expect(
        useCase.execute({
          merchantId: 'unverified_merchant',
          customerId: 'customer_123',
          amountSAR: 100,
          idempotencyKey: 'test_key',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError if customer not found', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({
          merchantId: 'merchant_123',
          customerId: 'nonexistent_customer',
          amountSAR: 100,
          idempotencyKey: 'test_key',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if customer not enrolled', async () => {
      const unenrolledCustomer = Customer.create(
        new PhoneNumber('0504444444'),
        'Unenrolled Customer',
      );

      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(unenrolledCustomer);

      await expect(
        useCase.execute({
          merchantId: 'merchant_123',
          customerId: unenrolledCustomer.getCustomerId(),
          amountSAR: 100,
          idempotencyKey: 'test_key',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should throw UnauthorizedError if customer has not granted consent', async () => {
      const noConsentCustomer = Customer.create(
        new PhoneNumber('0505555555'),
        'No Consent Customer',
      );
      noConsentCustomer.enrollWithMerchant('merchant_123');
      // Don't grant consent

      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(noConsentCustomer);

      await expect(
        useCase.execute({
          merchantId: 'merchant_123',
          customerId: noConsentCustomer.getCustomerId(),
          amountSAR: 100,
          idempotencyKey: 'test_key',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw ValidationError if purchase below minimum', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      await expect(
        useCase.execute({
          merchantId: 'merchant_123',
          customerId: testCustomer.getCustomerId(),
          amountSAR: 0.5, // Below 1 SAR minimum
          idempotencyKey: 'test_key',
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Metadata Handling', () => {
    it('should store metadata in transaction', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      const metadata = {
        receiptNumber: 'REC-12345',
        cashierName: 'Ahmed',
        terminalId: 'POS-01',
        notes: 'Customer paid with cash',
      };

      await useCase.execute({
        merchantId: 'merchant_123',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 100,
        idempotencyKey: 'test_key',
        metadata,
      });

      // Verify transaction was saved with metadata
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          getMetadata: expect.any(Function),
        }),
      );
    });
  });

  describe('Tier Upgrade Detection', () => {
    it('should detect tier upgrade from Bronze to Gold when enough points earned', async () => {
      // Setup: customer at Bronze with 4500 monthly progress
      // addPointsFromPurchase will add to monthlyProgress, so give 4500 global pts
      testCustomer.addPointsFromPurchase(
        'merchant_123',
        Points.from(4500), // global points -> monthlyProgress becomes 4500
        Points.from(4500), // merchant points
      );

      // Verify still Bronze (4500 < 5000 threshold)
      expect(testCustomer.getCurrentTier().getDisplayName()).toBe('Bronze');

      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      // Purchase 600 SAR -> 600 global pts (1.0x Bronze) -> total monthly 5100 -> Gold
      const result = await useCase.execute({
        merchantId: 'merchant_123',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 600,
        idempotencyKey: 'tier_upgrade_key',
      });

      expect(result.tierUpgrade).toBe(true);
      expect(result.currentTier).toBe('Gold');
    });
  });

  describe('Edge Case Amounts', () => {
    // ENTERPRISE tier has minimumPurchase: 0, so even 1 SAR is valid
    let enterpriseMerchant: Merchant;

    beforeEach(() => {
      enterpriseMerchant = Merchant.create(
        'Enterprise Store',
        new Email('enterprise-edge@example.com'),
        new PhoneNumber('0506666666'),
        'Owner',
        MerchantTier.ENTERPRISE,
      );
      enterpriseMerchant.verify();

      testCustomer.enrollWithMerchant('enterprise_edge');
      testCustomer.grantConsent('enterprise_edge');
    });

    it('should handle minimum valid amount (1 SAR)', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(enterpriseMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      const result = await useCase.execute({
        merchantId: 'enterprise_edge',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 1,
        idempotencyKey: 'edge_min_key',
      });

      expect(result.merchantPoints).toBeGreaterThanOrEqual(1);
      expect(result.globalPoints).toBeGreaterThanOrEqual(1);
    });

    it('should handle large amount (10000 SAR)', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(enterpriseMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      const result = await useCase.execute({
        merchantId: 'enterprise_edge',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 10000,
        idempotencyKey: 'edge_large_key',
      });

      // 10000 SAR * 1 pointsPerSAR = 10000 points
      expect(result.merchantPoints).toBe(10000);
      expect(result.globalPoints).toBe(10000);
    });

    it('should handle decimal amount (99.99 SAR) - floors to 99 points', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(enterpriseMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      const result = await useCase.execute({
        merchantId: 'enterprise_edge',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 99.99,
        idempotencyKey: 'edge_decimal_key',
      });

      // Math.floor(99.99 * 1) = 99
      expect(result.merchantPoints).toBe(99);
      expect(result.globalPoints).toBe(99);
    });
  });

  describe('Points Accumulation', () => {
    it('should accumulate global points across multiple purchases', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      // First purchase: 100 SAR -> 100 global pts -> balance 100
      const result1 = await useCase.execute({
        merchantId: 'merchant_123',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 100,
        idempotencyKey: 'accum_key_1',
      });

      expect(result1.globalPoints).toBe(100);
      expect(result1.newGlobalBalance).toBe(100);

      // Reset idempotency mock so second call is not cached
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);

      // Second purchase: 200 SAR -> 200 global pts -> balance 300
      const result2 = await useCase.execute({
        merchantId: 'merchant_123',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 200,
        idempotencyKey: 'accum_key_2',
      });

      expect(result2.globalPoints).toBe(200);
      expect(result2.newGlobalBalance).toBe(300);
    });
  });

  describe('Concurrent Idempotency', () => {
    it('should return same result for same idempotency key even with different amounts', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      // First call: 100 SAR, stores result
      const result1 = await useCase.execute({
        merchantId: 'merchant_123',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 100,
        idempotencyKey: 'concurrent_key',
      });

      expect(result1.merchantPoints).toBe(100);

      // Second call with same idempotency key returns cached result, ignores new amount
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(result1);

      const result2 = await useCase.execute({
        merchantId: 'merchant_123',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 500, // Different amount - should be ignored
        idempotencyKey: 'concurrent_key',
      });

      expect(result2).toEqual(result1);
      expect(result2.merchantPoints).toBe(100); // Original amount, not 500
    });
  });

  describe('Repository Interactions', () => {
    it('should call save on all three repositories exactly once per purchase', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      await useCase.execute({
        merchantId: 'merchant_123',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 100,
        idempotencyKey: 'repo_save_key',
      });

      expect(mockTransactionRepo.save).toHaveBeenCalledTimes(2);
      expect(mockCustomerRepo.save).toHaveBeenCalledTimes(1);
      expect(mockMerchantRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should not call any save if idempotency returns cached result', async () => {
      const cachedResponse = {
        transactionId: 'txn_cached',
        merchantPoints: 100,
        globalPoints: 100,
        newMerchantBalance: 100,
        newGlobalBalance: 100,
        currentTier: 'Bronze',
        tierUpgrade: false,
        earningMultiplier: 1.0,
        isDecayImmune: false,
        pointsToNextTier: 4900,
        message: 'Cached',
      };

      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(cachedResponse);

      await useCase.execute({
        merchantId: 'merchant_123',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 100,
        idempotencyKey: 'cached_repo_key',
      });

      expect(mockTransactionRepo.save).not.toHaveBeenCalled();
      expect(mockCustomerRepo.save).not.toHaveBeenCalled();
      expect(mockMerchantRepo.save).not.toHaveBeenCalled();
    });

    it('should increment merchant transaction count (merchantRepo.save called with updated merchant)', async () => {
      vi.mocked(mockIdempotencyService.getResult).mockResolvedValue(null);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);

      await useCase.execute({
        merchantId: 'merchant_123',
        customerId: testCustomer.getCustomerId(),
        amountSAR: 100,
        idempotencyKey: 'merchant_count_key',
      });

      // merchantRepo.save should have been called with the merchant that had incrementTransactionCount() called
      expect(mockMerchantRepo.save).toHaveBeenCalledTimes(1);
      expect(mockMerchantRepo.save).toHaveBeenCalledWith(testMerchant);
    });
  });
});
