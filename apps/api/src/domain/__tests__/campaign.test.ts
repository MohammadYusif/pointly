import { describe, expect, it } from 'vitest';
import type { CampaignEligibilityContext } from '../entities/Campaign';
import { Campaign, ValidationError } from '../index';

describe('Campaign Entity', () => {
  const futureStart = new Date(Date.now() + 86400000); // +1 day
  const futureEnd = new Date(Date.now() + 86400000 * 7); // +7 days

  it('should create a valid campaign with type defaults', () => {
    const campaign = Campaign.create('merchant-1', 'DOUBLE_POINTS');

    expect(campaign.getCampaignId()).toBeTruthy();
    expect(campaign.getMerchantId()).toBe('merchant-1');
    expect(campaign.getType()).toBe('DOUBLE_POINTS');
    expect(campaign.getName()).toBe('Double Points');
    expect(campaign.getMultiplier()).toBe(2);
    expect(campaign.getIsActive()).toBe(true);
  });

  it('should create a custom campaign with overrides', () => {
    const campaign = Campaign.create('merchant-1', 'CUSTOM', {
      name: 'Weekend Double Points',
      description: 'Double points on weekends',
      startDate: futureStart,
      endDate: futureEnd,
      multiplier: 2.0,
    });

    expect(campaign.getName()).toBe('Weekend Double Points');
    expect(campaign.getDescription()).toBe('Double points on weekends');
    expect(campaign.getMultiplier()).toBe(2.0);
  });

  it('should reject empty name for custom campaigns', () => {
    expect(() =>
      Campaign.create('merchant-1', 'CUSTOM', {
        name: '',
        startDate: futureStart,
        endDate: futureEnd,
      }),
    ).toThrow(ValidationError);
  });

  it('should reject end date before start date', () => {
    const start = new Date(Date.now() + 86400000 * 7);
    const end = new Date(Date.now() + 86400000);

    expect(() =>
      Campaign.create('merchant-1', 'CUSTOM', {
        name: 'Test',
        startDate: start,
        endDate: end,
      }),
    ).toThrow(ValidationError);
  });

  it('should reject multiplier below 1.0', () => {
    expect(() => Campaign.create('merchant-1', 'DOUBLE_POINTS', { multiplier: 0.5 })).toThrow(
      ValidationError,
    );
  });

  it('should reject multiplier above 5.0', () => {
    expect(() => Campaign.create('merchant-1', 'DOUBLE_POINTS', { multiplier: 6.0 })).toThrow(
      ValidationError,
    );
  });

  it('should detect active campaign when within date range', () => {
    const pastStart = new Date(Date.now() - 86400000);
    const campaign = Campaign.reconstitute({
      campaignId: 'test-id',
      merchantId: 'merchant-1',
      type: 'DOUBLE_POINTS',
      name: 'Active Campaign',
      description: 'desc',
      startDate: pastStart,
      endDate: futureEnd,
      multiplier: 2.0,
      isActive: true,
      createdAt: new Date(),
    });

    expect(campaign.isActiveNow()).toBe(true);
    expect(campaign.isExpired()).toBe(false);
  });

  it('should detect expired campaign', () => {
    const pastStart = new Date(Date.now() - 86400000 * 14);
    const pastEnd = new Date(Date.now() - 86400000);

    const campaign = Campaign.reconstitute({
      campaignId: 'test-id',
      merchantId: 'merchant-1',
      type: 'DOUBLE_POINTS',
      name: 'Expired',
      description: 'desc',
      startDate: pastStart,
      endDate: pastEnd,
      multiplier: 2.0,
      isActive: true,
      createdAt: new Date(),
    });

    expect(campaign.isActiveNow()).toBe(false);
    expect(campaign.isExpired()).toBe(true);
  });

  it('should detect scheduled campaign', () => {
    const campaign = Campaign.create('merchant-1', 'DOUBLE_POINTS', {
      startDate: futureStart,
      endDate: futureEnd,
      multiplier: 1.5,
    });

    expect(campaign.isScheduled()).toBe(true);
    expect(campaign.isActiveNow()).toBe(false);
  });

  it('should deactivate campaign', () => {
    const pastStart = new Date(Date.now() - 86400000);
    const campaign = Campaign.reconstitute({
      campaignId: 'test-id',
      merchantId: 'merchant-1',
      type: 'DOUBLE_POINTS',
      name: 'Active',
      description: 'desc',
      startDate: pastStart,
      endDate: futureEnd,
      multiplier: 2.0,
      isActive: true,
      createdAt: new Date(),
    });

    expect(campaign.isActiveNow()).toBe(true);
    campaign.deactivate();
    expect(campaign.isActiveNow()).toBe(false);
    expect(campaign.getIsActive()).toBe(false);
  });

  it('should serialize to JSON', () => {
    const campaign = Campaign.create('merchant-1', 'DOUBLE_POINTS');
    const json = campaign.toJSON();

    expect(json.campaignId).toBeTruthy();
    expect(json.merchantId).toBe('merchant-1');
    expect(json.type).toBe('DOUBLE_POINTS');
    expect(json.multiplier).toBe(2);
    expect(typeof json.startDate).toBe('string');
    expect(typeof json.endDate).toBe('string');
  });

  it('should include targetTiers in JSON when set', () => {
    const campaign = Campaign.create('merchant-1', 'DOUBLE_POINTS', {
      targetTiers: ['GOLD', 'PLATINUM'],
    });
    const json = campaign.toJSON();
    expect(json.targetTiers).toEqual(['GOLD', 'PLATINUM']);
  });

  it('should not include targetTiers in JSON when not set', () => {
    const campaign = Campaign.create('merchant-1', 'DOUBLE_POINTS');
    const json = campaign.toJSON();
    expect(json.targetTiers).toBeUndefined();
  });

  describe('isEligibleForCustomer', () => {
    const baseCtx: CampaignEligibilityContext = {
      enrolledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      customerTier: 'BRONZE',
    };

    it('should pass tier check when no targetTiers set', () => {
      const campaign = Campaign.create('merchant-1', 'DOUBLE_POINTS');
      expect(campaign.isEligibleForCustomer(baseCtx)).toBe(true);
    });

    it('should pass tier check when customer tier is in targetTiers', () => {
      const campaign = Campaign.create('merchant-1', 'DOUBLE_POINTS', {
        targetTiers: ['BRONZE', 'GOLD'],
      });
      expect(campaign.isEligibleForCustomer(baseCtx)).toBe(true);
    });

    it('should fail tier check when customer tier is not in targetTiers', () => {
      const campaign = Campaign.create('merchant-1', 'DOUBLE_POINTS', {
        targetTiers: ['GOLD', 'PLATINUM'],
      });
      expect(campaign.isEligibleForCustomer(baseCtx)).toBe(false);
    });

    it('should be eligible for DOUBLE_POINTS after tier check passes', () => {
      const campaign = Campaign.create('merchant-1', 'DOUBLE_POINTS');
      expect(campaign.isEligibleForCustomer(baseCtx)).toBe(true);
    });

    it('should be eligible for BIRTHDAY_REWARD when birthday falls within campaign date range', () => {
      const now = new Date();
      // Use today's date so birthday falls within the campaign range (starts today, lasts 30 days)
      const dob = `1990-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const campaign = Campaign.create('merchant-1', 'BIRTHDAY_REWARD');
      const ctx: CampaignEligibilityContext = { ...baseCtx, dateOfBirth: dob };
      expect(campaign.isEligibleForCustomer(ctx)).toBe(true);
    });

    it('should be eligible for BIRTHDAY_REWARD when birthday is 6 months away (year-round 365-day window)', () => {
      const now = new Date();
      // The default BIRTHDAY_REWARD campaign is 365 days — covers any birthday within the year
      const otherMonth = ((now.getMonth() + 6) % 12) + 1;
      const dob = `1990-${String(otherMonth).padStart(2, '0')}-15`;
      const campaign = Campaign.create('merchant-1', 'BIRTHDAY_REWARD');
      const ctx: CampaignEligibilityContext = { ...baseCtx, dateOfBirth: dob };
      expect(campaign.isEligibleForCustomer(ctx)).toBe(true);
    });

    it('should not be eligible for BIRTHDAY_REWARD when birthday is outside a short custom date range', () => {
      const now = new Date();
      // Merchant creates a custom short birthday window (7 days)
      const start = now;
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      // Birthday 6 months away is outside the 7-day window
      const otherMonth = ((now.getMonth() + 6) % 12) + 1;
      const dob = `1990-${String(otherMonth).padStart(2, '0')}-15`;
      const campaign = Campaign.create('merchant-1', 'BIRTHDAY_REWARD', { startDate: start, endDate: end });
      const ctx: CampaignEligibilityContext = { ...baseCtx, dateOfBirth: dob };
      expect(campaign.isEligibleForCustomer(ctx)).toBe(false);
    });

    it('should not be eligible for BIRTHDAY_REWARD when dateOfBirth is missing', () => {
      const campaign = Campaign.create('merchant-1', 'BIRTHDAY_REWARD');
      expect(campaign.isEligibleForCustomer(baseCtx)).toBe(false);
    });

    it('should be eligible for WIN_BACK when last transaction was 60+ days ago', () => {
      const campaign = Campaign.create('merchant-1', 'WIN_BACK');
      const ctx: CampaignEligibilityContext = {
        ...baseCtx,
        lastTransactionAt: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000),
      };
      expect(campaign.isEligibleForCustomer(ctx)).toBe(true);
    });

    it('should not be eligible for WIN_BACK when last transaction was recent', () => {
      const campaign = Campaign.create('merchant-1', 'WIN_BACK');
      const ctx: CampaignEligibilityContext = {
        ...baseCtx,
        lastTransactionAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(campaign.isEligibleForCustomer(ctx)).toBe(false);
    });

    it('should be eligible for WIN_BACK when customer never purchased', () => {
      const campaign = Campaign.create('merchant-1', 'WIN_BACK');
      expect(campaign.isEligibleForCustomer(baseCtx)).toBe(true);
    });

    it('should be eligible for WELCOME when enrolled within last 30 days', () => {
      const campaign = Campaign.create('merchant-1', 'WELCOME');
      expect(campaign.isEligibleForCustomer(baseCtx)).toBe(true);
    });

    it('should not be eligible for WELCOME when enrolled more than 30 days ago', () => {
      const campaign = Campaign.create('merchant-1', 'WELCOME');
      const ctx: CampaignEligibilityContext = {
        ...baseCtx,
        enrolledAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
      };
      expect(campaign.isEligibleForCustomer(ctx)).toBe(false);
    });

    it('should be eligible for HAPPY_HOUR after tier check', () => {
      const campaign = Campaign.create('merchant-1', 'HAPPY_HOUR');
      expect(campaign.isEligibleForCustomer(baseCtx)).toBe(true);
    });
  });
});
