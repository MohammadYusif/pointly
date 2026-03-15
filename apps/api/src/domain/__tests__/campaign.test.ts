import { describe, expect, it } from 'vitest';
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
});
