import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Campaign, Email, Merchant, MerchantTier, PhoneNumber } from '../../domain';
import { CustomerTierLevel } from '../../domain/config/TierConfig';
import { TIER_ORDER } from '../../domain/config/TierConfig';
import type { ICampaignRepository } from '../repositories/ICampaignRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { ITransactionRepository } from '../repositories/ITransactionRepository';
import { GetCustomerPerksUseCase } from '../use-cases/GetCustomerPerksUseCase';
import type { GetCustomerPerksRequest } from '../use-cases/GetCustomerPerksUseCase';

const MERCHANT_ID = 'merchant_test_1';
const CUSTOMER_ID = 'customer_test_1';

function makeMerchant(): Merchant {
  const email = new Email('shop@example.com');
  const phone = new PhoneNumber('0509876543');
  const merchant = Merchant.create('Test Shop', email, phone, 'Owner', MerchantTier.PROFESSIONAL);
  merchant.verify();
  return merchant;
}

function makeCampaign(overrides?: {
  type?: 'CUSTOM' | 'WIN_BACK' | 'WELCOME';
  endDate?: Date;
  isActive?: boolean;
  linkedPerkId?: string;
  maxUsesPerCustomer?: number;
  minPurchaseAmount?: number;
  termsMessage?: string;
  message?: string;
  winBackDays?: number;
  welcomeDays?: number;
}): Campaign {
  const type = overrides?.type ?? 'CUSTOM';
  const campaign = Campaign.create(MERCHANT_ID, type, {
    ...(type === 'CUSTOM' && {
      name: 'Test Campaign',
      description: 'Earn 2x points',
      startDate: new Date(Date.now() - 1000 * 60 * 60),
      endDate: overrides?.endDate ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    }),
    ...(type !== 'CUSTOM' && {
      startDate: new Date(Date.now() - 1000 * 60 * 60),
      endDate: overrides?.endDate ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    }),
    multiplier: 2,
    maxUsesPerCustomer: overrides?.maxUsesPerCustomer,
    minPurchaseAmount: overrides?.minPurchaseAmount,
    message: overrides?.message,
    winBackDays: overrides?.winBackDays,
    welcomeDays: overrides?.welcomeDays,
  });
  if (overrides?.linkedPerkId) campaign.setLinkedPerkId(overrides.linkedPerkId);
  if (overrides?.termsMessage) campaign.setTermsMessage(overrides.termsMessage);
  if (overrides?.isActive === false) campaign.deactivate();
  return campaign;
}

function makeBaseRequest(
  tierLevel: CustomerTierLevel = CustomerTierLevel.BRONZE,
  enrollmentOverrides?: Partial<GetCustomerPerksRequest['customerJSON']['enrollments'][number]>,
): GetCustomerPerksRequest {
  const tierRank = TIER_ORDER.indexOf(tierLevel);
  return {
    customerId: CUSTOMER_ID,
    customerTierLevel: tierLevel,
    customerTierRank: tierRank,
    enrolledMerchantIds: [MERCHANT_ID],
    customerJSON: {
      enrollments: [
        {
          merchantId: MERCHANT_ID,
          enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
          ...enrollmentOverrides,
        },
      ],
    },
  };
}

describe('GetCustomerPerksUseCase', () => {
  let useCase: GetCustomerPerksUseCase;
  let mockMerchantRepo: IMerchantRepository;
  let mockCampaignRepo: ICampaignRepository;
  let mockTransactionRepo: ITransactionRepository;

  beforeEach(() => {
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
      findByMerchant: vi.fn().mockResolvedValue({ items: [], count: 0, nextToken: undefined }),
      findActiveCampaignsForMerchant: vi.fn(),
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
      findByMerchantAndLocation: vi.fn(),
      findByCustomerAndMerchant: vi
        .fn()
        .mockResolvedValue({ items: [], count: 0, nextToken: undefined }),
      getMerchantStats: vi.fn(),
      getCustomerStats: vi.fn(),
      getMerchantAnalytics: vi.fn(),
      getLocationAnalytics: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: test mock returns empty persistence items
      toPersistenceItem: vi.fn().mockReturnValue([]) as any,
    };

    useCase = new GetCustomerPerksUseCase(mockMerchantRepo, mockCampaignRepo, mockTransactionRepo);
  });

  describe('isUnlocked', () => {
    it('returns isUnlocked: false when customer tier is below perk requiredTier', async () => {
      const merchant = makeMerchant();
      merchant.addPerk({
        type: 'EARLY_ACCESS',
        title: 'Gold Early Access',
        description: 'Early access for Gold members',
        requiredTier: CustomerTierLevel.GOLD,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const result = await useCase.execute(makeBaseRequest(CustomerTierLevel.BRONZE));

      expect(result).toHaveLength(1);
      expect(result[0]?.isUnlocked).toBe(false);
    });

    it('returns isUnlocked: true when customer tier meets perk requiredTier', async () => {
      const merchant = makeMerchant();
      merchant.addPerk({
        type: 'EARLY_ACCESS',
        title: 'Bronze Early Access',
        description: 'Open to all',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const result = await useCase.execute(makeBaseRequest(CustomerTierLevel.BRONZE));

      expect(result[0]?.isUnlocked).toBe(true);
    });

    it('returns isUnlocked: true when customer tier exceeds perk requiredTier', async () => {
      const merchant = makeMerchant();
      merchant.addPerk({
        type: 'EXCLUSIVE_PRODUCT',
        title: 'Gold product',
        description: 'For Gold+',
        requiredTier: CustomerTierLevel.GOLD,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const result = await useCase.execute(makeBaseRequest(CustomerTierLevel.DIAMOND));

      expect(result[0]?.isUnlocked).toBe(true);
    });
  });

  describe('BIRTHDAY_REWARD eligibility', () => {
    it('is eligible when dateOfBirth month matches current month', async () => {
      const merchant = makeMerchant();
      merchant.addPerk({
        type: 'BIRTHDAY_REWARD',
        title: 'Birthday perk',
        description: 'Happy birthday',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const now = new Date();
      const dob = new Date(2000, now.getMonth(), 15).toISOString().slice(0, 10);
      const req = makeBaseRequest();
      req.customerJSON.dateOfBirth = dob;

      const result = await useCase.execute(req);

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('BIRTHDAY_REWARD');
    });

    it('is not eligible when dateOfBirth month does not match current month', async () => {
      const merchant = makeMerchant();
      merchant.addPerk({
        type: 'BIRTHDAY_REWARD',
        title: 'Birthday perk',
        description: 'Happy birthday',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const now = new Date();
      const differentMonth = (now.getMonth() + 1) % 12;
      const dob = new Date(2000, differentMonth, 15).toISOString().slice(0, 10);
      const req = makeBaseRequest();
      req.customerJSON.dateOfBirth = dob;

      const result = await useCase.execute(req);

      expect(result).toHaveLength(0);
    });
  });

  describe('WIN_BACK eligibility', () => {
    it('is eligible when last transaction was more than 60 days ago', async () => {
      const merchant = makeMerchant();
      merchant.addPerk({
        type: 'WIN_BACK',
        title: 'We miss you',
        description: 'Come back',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const oldTx = new Date(Date.now() - 1000 * 60 * 60 * 24 * 61).toISOString();
      const result = await useCase.execute(
        makeBaseRequest(CustomerTierLevel.BRONZE, { lastTransactionAt: oldTx }),
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('WIN_BACK');
    });

    it('is eligible when customer has never transacted', async () => {
      const merchant = makeMerchant();
      merchant.addPerk({
        type: 'WIN_BACK',
        title: 'We miss you',
        description: 'Come back',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const result = await useCase.execute(
        makeBaseRequest(CustomerTierLevel.BRONZE, { lastTransactionAt: undefined }),
      );

      expect(result).toHaveLength(1);
    });

    it('is not eligible when last transaction was recent (within 60 days)', async () => {
      const merchant = makeMerchant();
      merchant.addPerk({
        type: 'WIN_BACK',
        title: 'We miss you',
        description: 'Come back',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const recentTx = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString();
      const result = await useCase.execute(
        makeBaseRequest(CustomerTierLevel.BRONZE, { lastTransactionAt: recentTx }),
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('WELCOME_OFFER eligibility', () => {
    it('is eligible when enrolled less than 30 days ago', async () => {
      const merchant = makeMerchant();
      merchant.addPerk({
        type: 'WELCOME_OFFER',
        title: 'Welcome',
        description: 'New member bonus',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const recentEnrollment = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString();
      const result = await useCase.execute(
        makeBaseRequest(CustomerTierLevel.BRONZE, { enrolledAt: recentEnrollment }),
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('WELCOME_OFFER');
    });

    it('is not eligible when enrolled more than 30 days ago', async () => {
      const merchant = makeMerchant();
      merchant.addPerk({
        type: 'WELCOME_OFFER',
        title: 'Welcome',
        description: 'New member bonus',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const oldEnrollment = new Date(Date.now() - 1000 * 60 * 60 * 24 * 31).toISOString();
      const result = await useCase.execute(
        makeBaseRequest(CustomerTierLevel.BRONZE, { enrolledAt: oldEnrollment }),
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('campaign enrichment', () => {
    it('includes campaign fields when perk has a linked active campaign', async () => {
      const merchant = makeMerchant();
      const perk = merchant.addPerk({
        type: 'SPEND_BONUS',
        title: 'Bonus points',
        description: 'Earn more',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const campaign = makeCampaign({ linkedPerkId: perk.id });
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [campaign],
        count: 1,
        nextToken: undefined,
      });

      const result = await useCase.execute(makeBaseRequest());

      expect(result).toHaveLength(1);
      expect(result[0]?.campaignId).toBe(campaign.getCampaignId());
      expect(result[0]?.campaignMultiplier).toBe(2);
      expect(result[0]?.campaignEndDate).toBeDefined();
    });

    it('sets isExhausted true and campaignUsesRemaining: 0 when customer used all campaign uses', async () => {
      const merchant = makeMerchant();
      const perk = merchant.addPerk({
        type: 'SPEND_BONUS',
        title: 'Bonus',
        description: 'Earn more',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const campaign = makeCampaign({ linkedPerkId: perk.id, maxUsesPerCustomer: 2 });
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [campaign],
        count: 1,
        nextToken: undefined,
      });

      const campaignId = campaign.getCampaignId();
      const mockTx = {
        getMetadata: () => ({ campaignId }),
      };
      vi.mocked(mockTransactionRepo.findByCustomerAndMerchant).mockResolvedValue({
        // biome-ignore lint/suspicious/noExplicitAny: minimal mock for metadata access
        items: [mockTx as any, mockTx as any],
        count: 2,
        nextToken: undefined,
      });

      const result = await useCase.execute(makeBaseRequest());

      expect(result[0]?.isExhausted).toBe(true);
      expect(result[0]?.campaignUsesRemaining).toBe(0);
    });

    it('returns perk without campaign fields when no campaign is linked', async () => {
      const merchant = makeMerchant();
      merchant.addPerk({
        type: 'SPEND_BONUS',
        title: 'No campaign perk',
        description: 'Always available',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const result = await useCase.execute(makeBaseRequest());

      expect(result).toHaveLength(1);
      expect(result[0]?.campaignId).toBeUndefined();
      expect(result[0]?.campaignMultiplier).toBeUndefined();
    });

    it('includes campaignMessage when linked campaign has a message', async () => {
      const merchant = makeMerchant();
      const perk = merchant.addPerk({
        type: 'SPEND_BONUS',
        title: 'Bonus points',
        description: 'Earn more',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const campaign = makeCampaign({ linkedPerkId: perk.id, message: 'Enjoy double points!' });
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [campaign],
        count: 1,
        nextToken: undefined,
      });

      const result = await useCase.execute(makeBaseRequest());

      expect(result[0]?.campaignMessage).toBe('Enjoy double points!');
    });

    it('omits campaignMessage when linked campaign has no message', async () => {
      const merchant = makeMerchant();
      const perk = merchant.addPerk({
        type: 'SPEND_BONUS',
        title: 'Bonus points',
        description: 'Earn more',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const campaign = makeCampaign({ linkedPerkId: perk.id });
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [campaign],
        count: 1,
        nextToken: undefined,
      });

      const result = await useCase.execute(makeBaseRequest());

      expect(result[0]?.campaignMessage).toBeUndefined();
    });
  });

  describe('campaign eligibility delegation', () => {
    it('WIN_BACK campaign with custom winBackDays: eligible when inactive long enough', async () => {
      const merchant = makeMerchant();
      const perk = merchant.addPerk({
        type: 'WIN_BACK',
        title: 'We miss you',
        description: 'Come back',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const campaign = makeCampaign({ type: 'WIN_BACK', linkedPerkId: perk.id, winBackDays: 7 });
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [campaign],
        count: 1,
        nextToken: undefined,
      });

      // 8 days since last transaction — exceeds the 7-day threshold
      const lastTx = new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString();
      const result = await useCase.execute(
        makeBaseRequest(CustomerTierLevel.BRONZE, { lastTransactionAt: lastTx }),
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('WIN_BACK');
    });

    it('WIN_BACK campaign with custom winBackDays: not eligible when recently active', async () => {
      const merchant = makeMerchant();
      const perk = merchant.addPerk({
        type: 'WIN_BACK',
        title: 'We miss you',
        description: 'Come back',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const campaign = makeCampaign({ type: 'WIN_BACK', linkedPerkId: perk.id, winBackDays: 7 });
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [campaign],
        count: 1,
        nextToken: undefined,
      });

      // 6 days since last transaction — within the 7-day threshold
      const recentTx = new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString();
      const result = await useCase.execute(
        makeBaseRequest(CustomerTierLevel.BRONZE, { lastTransactionAt: recentTx }),
      );

      expect(result).toHaveLength(0);
    });

    it('WELCOME campaign with custom welcomeDays: eligible when enrolled within window', async () => {
      const merchant = makeMerchant();
      const perk = merchant.addPerk({
        type: 'WELCOME_OFFER',
        title: 'Welcome',
        description: 'New member bonus',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const campaign = makeCampaign({
        type: 'WELCOME',
        linkedPerkId: perk.id,
        welcomeDays: 14,
      });
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [campaign],
        count: 1,
        nextToken: undefined,
      });

      // Enrolled 13 days ago — within the 14-day window
      const recentEnrollment = new Date(Date.now() - 1000 * 60 * 60 * 24 * 13).toISOString();
      const result = await useCase.execute(
        makeBaseRequest(CustomerTierLevel.BRONZE, { enrolledAt: recentEnrollment }),
      );

      expect(result).toHaveLength(1);
    });

    it('WELCOME campaign with custom welcomeDays: not eligible when enrolled outside window', async () => {
      const merchant = makeMerchant();
      const perk = merchant.addPerk({
        type: 'WELCOME_OFFER',
        title: 'Welcome',
        description: 'New member bonus',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const campaign = makeCampaign({
        type: 'WELCOME',
        linkedPerkId: perk.id,
        welcomeDays: 14,
      });
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [campaign],
        count: 1,
        nextToken: undefined,
      });

      // Enrolled 15 days ago — outside the 14-day window
      const oldEnrollment = new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString();
      const result = await useCase.execute(
        makeBaseRequest(CustomerTierLevel.BRONZE, { enrolledAt: oldEnrollment }),
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('filtering', () => {
    it('skips perks whose linked campaign is expired', async () => {
      const merchant = makeMerchant();
      const perk = merchant.addPerk({
        type: 'SPEND_BONUS',
        title: 'Expired campaign perk',
        description: 'Old offer',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const expiredCampaign = Campaign.create(MERCHANT_ID, 'CUSTOM', {
        name: 'Old Offer',
        description: 'Past campaign',
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
        endDate: new Date(Date.now() - 1000 * 60 * 60),
        multiplier: 2,
      });
      expiredCampaign.setLinkedPerkId(perk.id);
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [expiredCampaign],
        count: 1,
        nextToken: undefined,
      });

      const result = await useCase.execute(makeBaseRequest());

      expect(result).toHaveLength(0);
    });

    it('skips perks whose linked campaign is deactivated', async () => {
      const merchant = makeMerchant();
      const perk = merchant.addPerk({
        type: 'SPEND_BONUS',
        title: 'Deactivated campaign perk',
        description: 'Paused offer',
        requiredTier: CustomerTierLevel.BRONZE,
      });
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(merchant);

      const deactivatedCampaign = makeCampaign({
        linkedPerkId: perk.id,
        isActive: false,
      });
      vi.mocked(mockCampaignRepo.findByMerchant).mockResolvedValue({
        items: [deactivatedCampaign],
        count: 1,
        nextToken: undefined,
      });

      const result = await useCase.execute(makeBaseRequest());

      expect(result).toHaveLength(0);
    });
  });

  describe('empty cases', () => {
    it('returns empty array when customer has no enrollments', async () => {
      const req: GetCustomerPerksRequest = {
        customerId: CUSTOMER_ID,
        customerTierLevel: CustomerTierLevel.BRONZE,
        customerTierRank: 0,
        enrolledMerchantIds: [],
        customerJSON: { enrollments: [] },
      };

      const result = await useCase.execute(req);

      expect(result).toHaveLength(0);
      expect(mockMerchantRepo.findById).not.toHaveBeenCalled();
    });

    it('skips merchant gracefully when merchant is not found', async () => {
      vi.mocked(mockMerchantRepo.findById).mockResolvedValue(null);

      const result = await useCase.execute(makeBaseRequest());

      expect(result).toHaveLength(0);
    });
  });
});
