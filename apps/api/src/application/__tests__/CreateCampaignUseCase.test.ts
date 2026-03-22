import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Campaign,
  Email,
  Merchant,
  MerchantTier,
  NotFoundError,
  PhoneNumber,
  UnauthorizedError,
} from '../../domain';
import type { ICampaignRepository } from '../repositories/ICampaignRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { ICampaignNotificationService } from '../services/ICampaignNotificationService';
import { CreateCampaignUseCase } from '../use-cases/CreateCampaignUseCase';
import { DeactivateCampaignUseCase } from '../use-cases/DeactivateCampaignUseCase';
import { ListCampaignsUseCase } from '../use-cases/ListCampaignsUseCase';
import { UpdateCampaignUseCase } from '../use-cases/UpdateCampaignUseCase';

const merchantId = 'merchant_123';

function makeTestMerchant(): Merchant {
  const email = new Email('merchant@example.com');
  const phone = new PhoneNumber('0509876543');
  const m = Merchant.create('Test Store', email, phone, 'Owner', MerchantTier.PROFESSIONAL);
  m.verify();
  return m;
}

function makeMockMerchantRepo(): IMerchantRepository {
  return {
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
}

function makeMockCampaignRepo(): ICampaignRepository {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    findByMerchant: vi.fn(),
    findActiveCampaignsForMerchant: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: test mock returns empty persistence items
    toPersistenceItem: vi.fn().mockReturnValue([]) as any,
  };
}

describe('CreateCampaignUseCase', () => {
  let merchantRepo: IMerchantRepository;
  let campaignRepo: ICampaignRepository;
  let atomicWrite: ReturnType<typeof vi.fn>;
  let notificationService: ICampaignNotificationService;
  let useCase: CreateCampaignUseCase;
  let testMerchant: Merchant;

  beforeEach(() => {
    testMerchant = makeTestMerchant();
    merchantRepo = makeMockMerchantRepo();
    campaignRepo = makeMockCampaignRepo();
    atomicWrite = vi.fn().mockResolvedValue(undefined);
    notificationService = {
      notifyCustomers: vi.fn().mockResolvedValue(undefined),
    };
    useCase = new CreateCampaignUseCase(
      merchantRepo,
      campaignRepo,
      atomicWrite,
      notificationService,
    );
  });

  it('should create a campaign for a verified merchant', async () => {
    vi.mocked(merchantRepo.findById).mockResolvedValue(testMerchant);

    const result = await useCase.execute({
      merchantId,
      type: 'CUSTOM',
      name: 'Summer Sale',
      description: 'Double points all summer',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-08-31T23:59:59.000Z',
      multiplier: 2.0,
    });

    expect(result).toBeInstanceOf(Campaign);
    expect(result.getName()).toBe('Summer Sale');
    expect(result.getMultiplier()).toBe(2.0);
    expect(result.getMerchantId()).toBe(merchantId);
    expect(atomicWrite).toHaveBeenCalledTimes(1);
  });

  it('should create a typed campaign with auto-defaults', async () => {
    vi.mocked(merchantRepo.findById).mockResolvedValue(testMerchant);

    const result = await useCase.execute({ merchantId, type: 'DOUBLE_POINTS' });

    expect(result).toBeInstanceOf(Campaign);
    expect(result.getType()).toBe('DOUBLE_POINTS');
    expect(result.getName()).toBe('Double Points');
    expect(result.getMultiplier()).toBe(2);
    expect(result.getLinkedPerkId()).toBeTruthy();
  });

  it('should call notificationService.notifyCustomers on create', async () => {
    vi.mocked(merchantRepo.findById).mockResolvedValue(testMerchant);

    await useCase.execute({
      merchantId,
      type: 'CUSTOM',
      name: 'Summer Sale',
      description: 'Double points',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-08-31T23:59:59.000Z',
      multiplier: 2.0,
    });

    expect(notificationService.notifyCustomers).toHaveBeenCalledTimes(1);
    const [mid, bizName] = vi.mocked(notificationService.notifyCustomers).mock.calls[0] as [
      string,
      string,
      Campaign,
      string | undefined,
    ];
    expect(mid).toBe(merchantId);
    expect(bizName).toBe('Test Store');
  });

  it('should not fail campaign creation if notificationService throws', async () => {
    vi.mocked(merchantRepo.findById).mockResolvedValue(testMerchant);
    vi.mocked(notificationService.notifyCustomers).mockRejectedValue(new Error('SQS down'));

    const result = await useCase.execute({
      merchantId,
      type: 'CUSTOM',
      name: 'Sale',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-08-31T23:59:59.000Z',
      multiplier: 1.5,
    });

    expect(result).toBeInstanceOf(Campaign);
    expect(atomicWrite).toHaveBeenCalledTimes(1);
  });

  it('should pass platformFilter to notificationService', async () => {
    vi.mocked(merchantRepo.findById).mockResolvedValue(testMerchant);

    await useCase.execute({
      merchantId,
      type: 'CUSTOM',
      name: 'iOS Only',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-08-31T23:59:59.000Z',
      multiplier: 1.5,
      platformFilter: 'ios',
    });

    const [, , , platformFilter] = vi.mocked(notificationService.notifyCustomers).mock.calls[0] as [
      string,
      string,
      Campaign,
      string | undefined,
    ];
    expect(platformFilter).toBe('ios');
  });

  it('should not call notificationService when not provided', async () => {
    vi.mocked(merchantRepo.findById).mockResolvedValue(testMerchant);
    const useCaseNoNotify = new CreateCampaignUseCase(merchantRepo, campaignRepo, atomicWrite);

    const result = await useCaseNoNotify.execute({
      merchantId,
      type: 'DOUBLE_POINTS',
    });

    expect(result).toBeInstanceOf(Campaign);
  });

  it('should throw NotFoundError if merchant does not exist', async () => {
    vi.mocked(merchantRepo.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({ merchantId: 'nonexistent', type: 'DOUBLE_POINTS' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw UnauthorizedError if merchant is not verified', async () => {
    const unverified = Merchant.create(
      'Unverified',
      new Email('unverified@example.com'),
      new PhoneNumber('0503333333'),
      'Owner',
      MerchantTier.BASIC,
    );
    vi.mocked(merchantRepo.findById).mockResolvedValue(unverified);

    await expect(useCase.execute({ merchantId, type: 'DOUBLE_POINTS' })).rejects.toThrow(
      UnauthorizedError,
    );
  });
});

describe('ListCampaignsUseCase', () => {
  let campaignRepo: ICampaignRepository;
  let useCase: ListCampaignsUseCase;

  beforeEach(() => {
    campaignRepo = makeMockCampaignRepo();
    useCase = new ListCampaignsUseCase(campaignRepo);
  });

  it('should return campaigns for a merchant', async () => {
    const campaign = Campaign.create(merchantId, 'CUSTOM', {
      name: 'Test Campaign',
      description: 'Desc',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-31'),
      multiplier: 1.5,
    });
    vi.mocked(campaignRepo.findByMerchant).mockResolvedValue({
      items: [campaign],
      count: 1,
      nextToken: undefined,
    });

    const result = await useCase.execute(merchantId);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.getName()).toBe('Test Campaign');
  });

  it('should return empty list when no campaigns exist', async () => {
    vi.mocked(campaignRepo.findByMerchant).mockResolvedValue({
      items: [],
      count: 0,
      nextToken: undefined,
    });

    const result = await useCase.execute(merchantId);

    expect(result.items).toHaveLength(0);
  });
});

describe('DeactivateCampaignUseCase', () => {
  let merchantRepo: IMerchantRepository;
  let campaignRepo: ICampaignRepository;
  let atomicWrite: ReturnType<typeof vi.fn>;
  let useCase: DeactivateCampaignUseCase;

  beforeEach(() => {
    merchantRepo = makeMockMerchantRepo();
    campaignRepo = makeMockCampaignRepo();
    atomicWrite = vi.fn().mockResolvedValue(undefined);
    useCase = new DeactivateCampaignUseCase(merchantRepo, campaignRepo, atomicWrite);
  });

  it('should deactivate an existing campaign', async () => {
    const campaign = Campaign.create(merchantId, 'CUSTOM', {
      name: 'Summer Sale',
      description: 'Desc',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-31'),
      multiplier: 2.0,
    });
    vi.mocked(campaignRepo.findByMerchant).mockResolvedValue({
      items: [campaign],
      count: 1,
      nextToken: undefined,
    });

    await useCase.execute({ merchantId, campaignId: campaign.getCampaignId() });

    expect(campaign.getIsActive()).toBe(false);
    expect(atomicWrite).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundError if campaign does not exist', async () => {
    vi.mocked(campaignRepo.findByMerchant).mockResolvedValue({
      items: [],
      count: 0,
      nextToken: undefined,
    });

    await expect(
      useCase.execute({ merchantId, campaignId: 'nonexistent_campaign' }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('UpdateCampaignUseCase', () => {
  let campaignRepo: ICampaignRepository;
  let atomicWrite: ReturnType<typeof vi.fn>;
  let useCase: UpdateCampaignUseCase;

  beforeEach(() => {
    campaignRepo = makeMockCampaignRepo();
    atomicWrite = vi.fn().mockResolvedValue(undefined);
    useCase = new UpdateCampaignUseCase(campaignRepo, atomicWrite);
  });

  it('should update campaign multiplier and call atomicWrite', async () => {
    const campaign = Campaign.create(merchantId, 'CUSTOM', {
      name: 'Original Sale',
      description: 'Desc',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-31'),
      multiplier: 2.0,
    });
    vi.mocked(campaignRepo.findByMerchant).mockResolvedValue({
      items: [campaign],
      count: 1,
      nextToken: undefined,
    });

    const result = await useCase.execute({
      merchantId,
      campaignId: campaign.getCampaignId(),
      multiplier: 3,
    });

    expect(result).toBeInstanceOf(Campaign);
    expect(result.getMultiplier()).toBe(3);
    expect(atomicWrite).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundError when campaign does not exist on update', async () => {
    vi.mocked(campaignRepo.findByMerchant).mockResolvedValue({
      items: [],
      count: 0,
      nextToken: undefined,
    });

    await expect(
      useCase.execute({ merchantId, campaignId: 'nonexistent_id', multiplier: 3 }),
    ).rejects.toThrow(NotFoundError);
  });
});
