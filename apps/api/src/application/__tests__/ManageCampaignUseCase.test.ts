import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Campaign,
  Customer,
  Email,
  Merchant,
  MerchantTier,
  NotFoundError,
  PhoneNumber,
  UnauthorizedError,
} from '../../domain';
import type { ICampaignRepository } from '../repositories/ICampaignRepository';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { ISmsPublisherService } from '../services/ISmsPublisherService';
import { ManageCampaignUseCase } from '../use-cases/ManageCampaignUseCase';

describe('ManageCampaignUseCase', () => {
  let useCase: ManageCampaignUseCase;
  let mockMerchantRepo: IMerchantRepository;
  let mockCampaignRepo: ICampaignRepository;
  let mockCustomerRepo: ICustomerRepository;
  let mockSmsPublisher: ISmsPublisherService;
  let mockAtomicWrite: ReturnType<typeof vi.fn>;

  let testMerchant: Merchant;

  const merchantId = 'merchant_123';

  beforeEach(() => {
    const email = new Email('merchant@example.com');
    const phone = new PhoneNumber('0509876543');
    testMerchant = Merchant.create('Test Store', email, phone, 'Owner', MerchantTier.PROFESSIONAL);
    testMerchant.verify();

    mockAtomicWrite = vi.fn().mockResolvedValue(undefined);

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
      // biome-ignore lint/suspicious/noExplicitAny: test mock returns empty persistence items
      toPersistenceItem: vi.fn().mockReturnValue([]) as any,
    };

    mockCampaignRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findByMerchant: vi.fn(),
      findActiveCampaignsForMerchant: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock returns empty persistence items
      toPersistenceItem: vi.fn().mockReturnValue([]) as any,
    };

    mockCustomerRepo = {
      findById: vi.fn(),
      findByPhone: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      findByMerchant: vi.fn().mockResolvedValue({ items: [], count: 0, nextToken: undefined }),
      findAll: vi.fn(),
      isEnrolled: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock returns empty persistence items
      toPersistenceItem: vi.fn().mockReturnValue([]) as any,
      // biome-ignore lint/suspicious/noExplicitAny: test mock returns empty persistence items
      toEnrollmentItems: vi.fn().mockReturnValue([]) as any,
    };

    mockSmsPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
      publishBatch: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new ManageCampaignUseCase(
      mockMerchantRepo,
      mockCampaignRepo,
      mockAtomicWrite,
      mockCustomerRepo,
      mockSmsPublisher,
    );
  });

  describe('create', () => {
    it('should create a campaign for a verified merchant', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);

      const result = await useCase.execute({
        action: 'create',
        merchantId,
        type: 'CUSTOM',
        name: 'Summer Sale',
        description: 'Double points all summer',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-08-31T23:59:59.000Z',
        multiplier: 2.0,
      });

      expect(result).toBeInstanceOf(Campaign);
      const campaign = result as Campaign;
      expect(campaign.getName()).toBe('Summer Sale');
      expect(campaign.getMultiplier()).toBe(2.0);
      expect(campaign.getMerchantId()).toBe(merchantId);
      expect(mockAtomicWrite).toHaveBeenCalledTimes(1);
    });

    it('should create a typed campaign with auto-defaults', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);

      const result = await useCase.execute({
        action: 'create',
        merchantId,
        type: 'DOUBLE_POINTS',
      });

      expect(result).toBeInstanceOf(Campaign);
      const campaign = result as Campaign;
      expect(campaign.getType()).toBe('DOUBLE_POINTS');
      expect(campaign.getName()).toBe('Double Points');
      expect(campaign.getMultiplier()).toBe(2);
      expect(campaign.getLinkedPerkId()).toBeTruthy();
    });

    it('should send SMS notifications to customers on campaign create', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);

      const customer1 = Customer.create(new PhoneNumber('0501111111'), 'Customer 1');
      const customer2 = Customer.create(new PhoneNumber('0502222222'), 'Customer 2');
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: [customer1, customer2],
        count: 2,
        nextToken: undefined,
      });

      await useCase.execute({
        action: 'create',
        merchantId,
        type: 'CUSTOM',
        name: 'Summer Sale',
        description: 'Double points',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-08-31T23:59:59.000Z',
        multiplier: 2.0,
      });

      expect(mockSmsPublisher.publishBatch).toHaveBeenCalledTimes(1);
      const messages = vi.mocked(mockSmsPublisher.publishBatch).mock.calls[0]?.[0];
      expect(messages).toHaveLength(2);
      expect(messages?.[0]?.type).toBe('CAMPAIGN_NOTIFICATION');
      expect(messages?.[0]?.body).toContain('Test Store');
      expect(messages?.[0]?.body).toContain('Summer Sale');
    });

    it('should not fail campaign creation if SMS publish fails', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: [Customer.create(new PhoneNumber('0501111111'))],
        count: 1,
        nextToken: undefined,
      });
      vi.mocked(mockSmsPublisher.publishBatch).mockRejectedValue(new Error('SQS down'));

      const result = await useCase.execute({
        action: 'create',
        merchantId,
        type: 'CUSTOM',
        name: 'Sale',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-08-31T23:59:59.000Z',
        multiplier: 1.5,
      });

      expect(result).toBeInstanceOf(Campaign);
      expect(mockAtomicWrite).toHaveBeenCalledTimes(1);
    });

    it('should send no SMS when merchant has no customers', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(testMerchant);
      vi.mocked(mockCustomerRepo.findByMerchant).mockResolvedValue({
        items: [],
        count: 0,
        nextToken: undefined,
      });

      await useCase.execute({
        action: 'create',
        merchantId,
        type: 'CUSTOM',
        name: 'Sale',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-08-31T23:59:59.000Z',
        multiplier: 1.5,
      });

      expect(mockSmsPublisher.publishBatch).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if merchant does not exist', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({
          action: 'create',
          merchantId: 'nonexistent',
          type: 'DOUBLE_POINTS',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw UnauthorizedError if merchant is not verified', async () => {
      const unverifiedMerchant = Merchant.create(
        'Unverified',
        new Email('unverified@example.com'),
        new PhoneNumber('0503333333'),
        'Owner',
        MerchantTier.BASIC,
      );
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(unverifiedMerchant);

      await expect(
        useCase.execute({
          action: 'create',
          merchantId,
          type: 'DOUBLE_POINTS',
        }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('list', () => {
    it('should return campaigns for a merchant', async () => {
      const campaign = Campaign.create(merchantId, 'CUSTOM', {
        name: 'Test Campaign',
        description: 'Desc',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-08-31'),
        multiplier: 1.5,
      });
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [campaign],
        count: 1,
        nextToken: undefined,
      });

      const result = await useCase.execute({ action: 'list', merchantId });

      expect(result).toBeDefined();
      const queryResult = result as { items: Campaign[]; count: number };
      expect(queryResult.items).toHaveLength(1);
      expect(queryResult.items[0]?.getName()).toBe('Test Campaign');
    });

    it('should return empty list when no campaigns exist', async () => {
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [],
        count: 0,
        nextToken: undefined,
      });

      const result = await useCase.execute({ action: 'list', merchantId });

      const queryResult = result as { items: Campaign[]; count: number };
      expect(queryResult.items).toHaveLength(0);
    });
  });

  describe('deactivate', () => {
    it('should deactivate an existing campaign', async () => {
      const campaign = Campaign.create(merchantId, 'CUSTOM', {
        name: 'Summer Sale',
        description: 'Desc',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-08-31'),
        multiplier: 2.0,
      });
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [campaign],
        count: 1,
        nextToken: undefined,
      });

      await useCase.execute({
        action: 'deactivate',
        merchantId,
        campaignId: campaign.getCampaignId(),
      });

      expect(campaign.getIsActive()).toBe(false);
      expect(mockAtomicWrite).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError if campaign does not exist', async () => {
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [],
        count: 0,
        nextToken: undefined,
      });

      await expect(
        useCase.execute({
          action: 'deactivate',
          merchantId,
          campaignId: 'nonexistent_campaign',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
