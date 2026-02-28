import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConsentStatus,
  Customer,
  Email,
  Merchant,
  MerchantTier,
  NotFoundError,
  PhoneNumber,
} from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import { ApproveConsentUseCase } from '../use-cases/ApproveConsentUseCase';

describe('ApproveConsentUseCase', () => {
  let useCase: ApproveConsentUseCase;
  let mockCustomerRepo: ICustomerRepository;
  let mockMerchantRepo: IMerchantRepository;
  let mockAtomicWrite: ReturnType<typeof vi.fn>;

  let testCustomer: Customer;
  let testMerchant: Merchant;

  const merchantId = 'merchant_123';

  beforeEach(() => {
    const phone = new PhoneNumber('0501234567');
    testCustomer = Customer.create(phone, 'Ahmed Al-Saud');
    testCustomer.enrollWithMerchant(merchantId);
    // consent starts PENDING after enrollWithMerchant

    const email = new Email('merchant@example.com');
    const merchantPhone = new PhoneNumber('0509876543');
    testMerchant = Merchant.create('Test Store', email, merchantPhone, 'Owner', MerchantTier.BASIC);
    testMerchant.verify();

    mockAtomicWrite = vi.fn().mockResolvedValue(undefined);

    const profileItem = [{ tableName: 'test', item: { PK: 'CUSTOMER#1', SK: 'PROFILE' } }];
    const enrollmentItems = [
      { tableName: 'test', item: { PK: 'CUSTOMER#1', SK: 'PROFILE' } },
      { tableName: 'test', item: { PK: 'CUSTOMER#1', SK: `MERCHANT_INDEX#${merchantId}` } },
    ];

    mockCustomerRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findByPhone: vi.fn(),
      findByMerchant: vi.fn(),
      findPendingConsents: vi.fn(),
      findAll: vi.fn(),
      isEnrolled: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      toPersistenceItem: vi.fn().mockReturnValue(profileItem) as any,
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      toEnrollmentItems: vi.fn().mockReturnValue(enrollmentItems) as any,
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
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      toPersistenceItem: vi.fn().mockReturnValue([]) as any,
    };

    useCase = new ApproveConsentUseCase(mockCustomerRepo, mockMerchantRepo, mockAtomicWrite);
  });

  describe('approve action', () => {
    it('should call toEnrollmentItems (profile + GSI2 index) when action is approve', async () => {
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);

      await useCase.execute({
        merchantId,
        customerId: testCustomer.getCustomerId(),
        action: 'approve',
      });

      expect(mockCustomerRepo.toEnrollmentItems).toHaveBeenCalledWith(testCustomer, merchantId);
      expect(mockCustomerRepo.toPersistenceItem).not.toHaveBeenCalled();
      // atomicWrite must receive the two-item enrollment array (profile + index)
      expect(mockAtomicWrite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ item: expect.objectContaining({ SK: 'PROFILE' }) }),
          expect.objectContaining({
            item: expect.objectContaining({ SK: `MERCHANT_INDEX#${merchantId}` }),
          }),
        ]),
      );
    });

    it('should grant consent on the customer aggregate', async () => {
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);

      const result = await useCase.execute({
        merchantId,
        customerId: testCustomer.getCustomerId(),
        action: 'approve',
      });

      expect(result.consentStatus).toBe(ConsentStatus.GRANTED);
    });

    it('should return customerId, merchantId, and consentStatus', async () => {
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);

      const result = await useCase.execute({
        merchantId,
        customerId: testCustomer.getCustomerId(),
        action: 'approve',
      });

      expect(result.customerId).toBe(testCustomer.getCustomerId());
      expect(result.merchantId).toBe(merchantId);
      expect(result.consentStatus).toBe(ConsentStatus.GRANTED);
    });
  });

  describe('deny action', () => {
    it('should call toPersistenceItem (profile only) when action is deny', async () => {
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);

      await useCase.execute({
        merchantId,
        customerId: testCustomer.getCustomerId(),
        action: 'deny',
      });

      expect(mockCustomerRepo.toPersistenceItem).toHaveBeenCalledWith(testCustomer);
      expect(mockCustomerRepo.toEnrollmentItems).not.toHaveBeenCalled();
      // atomicWrite must receive only the profile item (no GSI2 index)
      expect(mockAtomicWrite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ item: expect.objectContaining({ SK: 'PROFILE' }) }),
        ]),
      );
      const writtenItems: unknown[] = mockAtomicWrite.mock.calls[0][0];
      expect(writtenItems).toHaveLength(1);
    });

    it('should revoke consent on the customer aggregate', async () => {
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);

      const result = await useCase.execute({
        merchantId,
        customerId: testCustomer.getCustomerId(),
        action: 'deny',
      });

      expect(result.consentStatus).toBe(ConsentStatus.REVOKED);
    });
  });

  describe('not found errors', () => {
    it('should throw NotFoundError when customer does not exist', async () => {
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({ merchantId, customerId: 'ghost', action: 'approve' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when merchant does not exist', async () => {
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(testCustomer);
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({
          merchantId: 'ghost_merchant',
          customerId: testCustomer.getCustomerId(),
          action: 'approve',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should not call atomicWrite when customer not found', async () => {
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({ merchantId, customerId: 'ghost', action: 'approve' }),
      ).rejects.toThrow();

      expect(mockAtomicWrite).not.toHaveBeenCalled();
    });
  });
});
