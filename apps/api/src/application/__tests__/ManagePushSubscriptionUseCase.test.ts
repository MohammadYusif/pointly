import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type {
  IPushSubscriptionRepository,
  PlatformCounts,
} from '../repositories/IPushSubscriptionRepository';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';
import { ManagePushSubscriptionUseCase } from '../use-cases/ManagePushSubscriptionUseCase';

const makeMockRepo = (): IPushSubscriptionRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  findByCustomer: vi.fn().mockResolvedValue([]),
  deleteByEndpointHash: vi.fn().mockResolvedValue(undefined),
  deleteSubscriptionWithMerchantIndexes: vi.fn().mockResolvedValue(undefined),
  findPlatformCountsByMerchant: vi.fn().mockResolvedValue({ ios: 2, android: 5, web: 3 }),
  findByPlatform: vi.fn().mockResolvedValue([]),
  findAll: vi.fn().mockResolvedValue([]),
  saveMerchantIndexRecords: vi.fn().mockReturnValue([] as PersistenceItem[]),
  toPushSubscriptionPersistenceItem: vi.fn().mockReturnValue({
    tableName: 'test-table',
    item: {},
  } as PersistenceItem),
});

const makeMockCustomerRepo = (): ICustomerRepository => ({
  findById: vi.fn().mockResolvedValue(null),
  findByPhone: vi.fn().mockResolvedValue(null),
  findByMerchant: vi.fn().mockResolvedValue({ items: [], count: 0 }),
  findAll: vi.fn().mockResolvedValue({ items: [], count: 0 }),
  isEnrolled: vi.fn().mockResolvedValue(false),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(false),
  toPersistenceItem: vi.fn().mockReturnValue([]),
  toEnrollmentItems: vi.fn().mockReturnValue([]),
});

const makeWriteAll = () => vi.fn().mockResolvedValue(undefined);

describe('ManagePushSubscriptionUseCase', () => {
  let mockRepo: IPushSubscriptionRepository;
  let mockCustomerRepo: ICustomerRepository;
  let mockWriteAll: ReturnType<typeof makeWriteAll>;

  beforeEach(() => {
    mockRepo = makeMockRepo();
    mockCustomerRepo = makeMockCustomerRepo();
    mockWriteAll = makeWriteAll();
  });

  describe('getVapidKey', () => {
    it('returns null when VAPID public key is absent', async () => {
      const useCase = new ManagePushSubscriptionUseCase(
        mockRepo,
        undefined,
        mockCustomerRepo,
        mockWriteAll,
      );
      const result = await useCase.execute({ action: 'getVapidKey' });
      expect(result).toEqual({ publicKey: null });
    });

    it('returns the public key when VAPID public key is set', async () => {
      const useCase = new ManagePushSubscriptionUseCase(
        mockRepo,
        'test-public-key',
        mockCustomerRepo,
        mockWriteAll,
      );
      const result = await useCase.execute({ action: 'getVapidKey' });
      expect(result).toEqual({ publicKey: 'test-public-key' });
    });
  });

  describe('subscribe', () => {
    it('saves a PushSubscription with the correct platform via writeAll', async () => {
      const useCase = new ManagePushSubscriptionUseCase(
        mockRepo,
        undefined,
        mockCustomerRepo,
        mockWriteAll,
      );
      const result = await useCase.execute({
        action: 'subscribe',
        customerId: 'customer-abc',
        endpoint: 'https://push.example.com/sub/123',
        p256dh: 'p256dh-key',
        auth: 'auth-secret',
        platform: 'web',
      });

      expect(mockRepo.toPushSubscriptionPersistenceItem).toHaveBeenCalledOnce();
      expect(mockWriteAll).toHaveBeenCalledOnce();

      const persistedSub = vi.mocked(mockRepo.toPushSubscriptionPersistenceItem).mock.calls[0][0];
      expect(persistedSub.customerId).toBe('customer-abc');
      expect(persistedSub.platform).toBe('web');
      expect(persistedSub.endpoint).toBe('https://push.example.com/sub/123');
      expect(persistedSub.p256dhKey).toBe('p256dh-key');
      expect(persistedSub.authKey).toBe('auth-secret');
      expect(persistedSub.pushId).toBeTruthy();

      expect(result).toBe(persistedSub);
    });

    it('includes merchant index records when customer has enrollments', async () => {
      const mockEnrollments = new Map([
        ['merchant-1', {}],
        ['merchant-2', {}],
      ]);
      const mockCustomer = { getEnrollments: () => mockEnrollments };
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(mockCustomer as never);

      const mockIndexItems: PersistenceItem[] = [
        { tableName: 'test-table', item: { PK: 'MERCHANT_PUSH#merchant-1' } },
        { tableName: 'test-table', item: { PK: 'MERCHANT_PUSH#merchant-2' } },
      ];
      vi.mocked(mockRepo.saveMerchantIndexRecords).mockReturnValue(mockIndexItems);

      const mainPersistenceItem: PersistenceItem = {
        tableName: 'test-table',
        item: { PK: 'CUSTOMER#customer-abc' },
      };
      vi.mocked(mockRepo.toPushSubscriptionPersistenceItem).mockReturnValue(mainPersistenceItem);

      const useCase = new ManagePushSubscriptionUseCase(
        mockRepo,
        undefined,
        mockCustomerRepo,
        mockWriteAll,
      );
      await useCase.execute({
        action: 'subscribe',
        customerId: 'customer-abc',
        endpoint: 'https://push.example.com/sub/123',
        p256dh: 'p256dh-key',
        auth: 'auth-secret',
        platform: 'web',
      });

      expect(mockRepo.saveMerchantIndexRecords).toHaveBeenCalledWith(
        ['merchant-1', 'merchant-2'],
        expect.objectContaining({ customerId: 'customer-abc' }),
      );
      expect(mockWriteAll).toHaveBeenCalledWith([mainPersistenceItem, ...mockIndexItems]);
    });
  });

  describe('unsubscribe', () => {
    it('calls deleteByEndpointHash when customer has no enrollments', async () => {
      const useCase = new ManagePushSubscriptionUseCase(
        mockRepo,
        undefined,
        mockCustomerRepo,
        mockWriteAll,
      );
      await useCase.execute({
        action: 'unsubscribe',
        customerId: 'customer-abc',
        endpoint: 'https://push.example.com/sub/123',
      });

      expect(mockRepo.deleteByEndpointHash).toHaveBeenCalledOnce();
      const [customerId, hash] = vi.mocked(mockRepo.deleteByEndpointHash).mock.calls[0];
      expect(customerId).toBe('customer-abc');
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(64);
    });

    it('calls deleteSubscriptionWithMerchantIndexes when customer has enrollments', async () => {
      const mockEnrollments = new Map([
        ['merchant-1', {}],
        ['merchant-2', {}],
      ]);
      const mockCustomer = { getEnrollments: () => mockEnrollments };
      vi.mocked(mockCustomerRepo.findById).mockResolvedValue(mockCustomer as never);

      const useCase = new ManagePushSubscriptionUseCase(
        mockRepo,
        undefined,
        mockCustomerRepo,
        mockWriteAll,
      );
      await useCase.execute({
        action: 'unsubscribe',
        customerId: 'customer-abc',
        endpoint: 'https://push.example.com/sub/123',
      });

      expect(mockRepo.deleteSubscriptionWithMerchantIndexes).toHaveBeenCalledOnce();
      const [customerId, hash, merchantIds] = vi.mocked(
        mockRepo.deleteSubscriptionWithMerchantIndexes,
      ).mock.calls[0];
      expect(customerId).toBe('customer-abc');
      expect(hash).toHaveLength(64);
      expect(merchantIds).toEqual(['merchant-1', 'merchant-2']);
      expect(mockRepo.deleteByEndpointHash).not.toHaveBeenCalled();
    });
  });

  describe('getPlatformStats', () => {
    it('returns platform counts from the repository', async () => {
      const expectedCounts: PlatformCounts = { ios: 2, android: 5, web: 3 };
      vi.mocked(mockRepo.findPlatformCountsByMerchant).mockResolvedValue(expectedCounts);

      const useCase = new ManagePushSubscriptionUseCase(
        mockRepo,
        undefined,
        mockCustomerRepo,
        mockWriteAll,
      );
      const result = await useCase.execute({
        action: 'getPlatformStats',
        merchantId: 'merchant-xyz',
      });

      expect(mockRepo.findPlatformCountsByMerchant).toHaveBeenCalledWith('merchant-xyz');
      expect(result).toEqual(expectedCounts);
    });
  });
});
