import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  IPushSubscriptionRepository,
  PlatformCounts,
} from '../repositories/IPushSubscriptionRepository';
import { ManagePushSubscriptionUseCase } from '../use-cases/ManagePushSubscriptionUseCase';

const makeMockRepo = (): IPushSubscriptionRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  findByCustomer: vi.fn().mockResolvedValue([]),
  deleteByEndpointHash: vi.fn().mockResolvedValue(undefined),
  findPlatformCountsByMerchant: vi.fn().mockResolvedValue({ ios: 2, android: 5, web: 3 }),
  findByPlatform: vi.fn().mockResolvedValue([]),
});

describe('ManagePushSubscriptionUseCase', () => {
  let mockRepo: IPushSubscriptionRepository;

  beforeEach(() => {
    mockRepo = makeMockRepo();
  });

  describe('getVapidKey', () => {
    it('returns null when VAPID public key is absent', async () => {
      const useCase = new ManagePushSubscriptionUseCase(mockRepo, undefined);
      const result = await useCase.execute({ action: 'getVapidKey' });
      expect(result).toEqual({ publicKey: null });
    });

    it('returns the public key when VAPID public key is set', async () => {
      const useCase = new ManagePushSubscriptionUseCase(mockRepo, 'test-public-key');
      const result = await useCase.execute({ action: 'getVapidKey' });
      expect(result).toEqual({ publicKey: 'test-public-key' });
    });
  });

  describe('subscribe', () => {
    it('saves a PushSubscription with the correct platform', async () => {
      const useCase = new ManagePushSubscriptionUseCase(mockRepo, undefined);
      const result = await useCase.execute({
        action: 'subscribe',
        customerId: 'customer-abc',
        endpoint: 'https://push.example.com/sub/123',
        p256dh: 'p256dh-key',
        auth: 'auth-secret',
        platform: 'web',
      });

      expect(mockRepo.save).toHaveBeenCalledOnce();

      const savedSub = vi.mocked(mockRepo.save).mock.calls[0][0];
      expect(savedSub.customerId).toBe('customer-abc');
      expect(savedSub.platform).toBe('web');
      expect(savedSub.endpoint).toBe('https://push.example.com/sub/123');
      expect(savedSub.p256dhKey).toBe('p256dh-key');
      expect(savedSub.authKey).toBe('auth-secret');
      expect(savedSub.pushId).toBeTruthy();

      expect(result).toBe(savedSub);
    });
  });

  describe('unsubscribe', () => {
    it('calls deleteByEndpointHash with the correct customer and hash', async () => {
      const useCase = new ManagePushSubscriptionUseCase(mockRepo, undefined);
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
  });

  describe('getPlatformStats', () => {
    it('returns platform counts from the repository', async () => {
      const expectedCounts: PlatformCounts = { ios: 2, android: 5, web: 3 };
      vi.mocked(mockRepo.findPlatformCountsByMerchant).mockResolvedValue(expectedCounts);

      const useCase = new ManagePushSubscriptionUseCase(mockRepo, undefined);
      const result = await useCase.execute({
        action: 'getPlatformStats',
        merchantId: 'merchant-xyz',
      });

      expect(mockRepo.findPlatformCountsByMerchant).toHaveBeenCalledWith('merchant-xyz');
      expect(result).toEqual(expectedCounts);
    });
  });
});
