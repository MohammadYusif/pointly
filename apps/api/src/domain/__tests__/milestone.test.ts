import { describe, expect, it } from 'vitest';
import type { MilestoneConfig } from '../entities/Merchant';
import { Customer, PhoneNumber, Points } from '../index';

function createCustomer() {
  return Customer.create(new PhoneNumber('0501234567'), 'Test User');
}

const milestones: MilestoneConfig[] = [
  { id: 'ms-bronze', label: 'First 1,000 Points!', threshold: 1000, bonusPoints: 100 },
  { id: 'ms-silver', label: 'First 5,000 Points!', threshold: 5000, bonusPoints: 500 },
  { id: 'ms-gold', label: 'First 10,000 Points!', threshold: 10000, bonusPoints: 1000 },
];

describe('Lifetime Milestone Rewards', () => {
  it('starts with no claimed milestones', () => {
    const customer = createCustomer();
    expect(customer.getClaimedMilestones()).toEqual([]);
  });

  it('returns empty array when no milestones configured', () => {
    const customer = createCustomer();
    customer.awardGlobalPoints(Points.from(5000));
    const claimed = customer.checkAndClaimMilestones([]);
    expect(claimed).toEqual([]);
  });

  it('does not claim milestone when threshold not yet reached', () => {
    const customer = createCustomer();
    customer.awardGlobalPoints(Points.from(999));
    const claimed = customer.checkAndClaimMilestones(milestones);
    expect(claimed).toHaveLength(0);
    expect(customer.getClaimedMilestones()).toEqual([]);
  });

  it('claims milestone when threshold is exactly met', () => {
    const customer = createCustomer();
    customer.awardGlobalPoints(Points.from(1000));
    const claimed = customer.checkAndClaimMilestones(milestones);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.id).toBe('ms-bronze');
    expect(customer.getClaimedMilestones()).toContain('ms-bronze');
  });

  it('awards bonus points when milestone is claimed', () => {
    const customer = createCustomer();
    customer.awardGlobalPoints(Points.from(1000));
    const balanceBefore = customer.getGlobalPointsBalance().toNumber();
    const lifetimeBefore = customer.getGlobalLifetimePoints().toNumber();

    customer.checkAndClaimMilestones(milestones);

    // Balance should increase by bonusPoints (100)
    expect(customer.getGlobalPointsBalance().toNumber()).toBe(balanceBefore + 100);
    // Lifetime should also increase
    expect(customer.getGlobalLifetimePoints().toNumber()).toBe(lifetimeBefore + 100);
  });

  it('does NOT re-claim the same milestone on subsequent calls (idempotent)', () => {
    const customer = createCustomer();
    customer.awardGlobalPoints(Points.from(1000));

    const claimed1 = customer.checkAndClaimMilestones(milestones);
    expect(claimed1).toHaveLength(1);

    const claimed2 = customer.checkAndClaimMilestones(milestones);
    expect(claimed2).toHaveLength(0);

    // Balance should only have the bonus once
    expect(customer.getGlobalPointsBalance().toNumber()).toBe(1000 + 100);
  });

  it('claims multiple milestones in one call when several thresholds are crossed', () => {
    const customer = createCustomer();
    customer.awardGlobalPoints(Points.from(5000));

    const claimed = customer.checkAndClaimMilestones(milestones);
    expect(claimed).toHaveLength(2);
    expect(claimed.map((m) => m.id)).toContain('ms-bronze');
    expect(claimed.map((m) => m.id)).toContain('ms-silver');
    expect(customer.getClaimedMilestones()).toContain('ms-bronze');
    expect(customer.getClaimedMilestones()).toContain('ms-silver');
    expect(customer.getClaimedMilestones()).not.toContain('ms-gold');
  });

  it('claims all milestones when all thresholds are crossed', () => {
    const customer = createCustomer();
    customer.awardGlobalPoints(Points.from(10000));

    const claimed = customer.checkAndClaimMilestones(milestones);
    expect(claimed).toHaveLength(3);
    expect(customer.getClaimedMilestones()).toHaveLength(3);
    // Bonus: 100 + 500 + 1000 = 1600
    expect(customer.getGlobalPointsBalance().toNumber()).toBe(10000 + 1600);
  });

  it('incrementally claims milestones as customer earns more points', () => {
    const customer = createCustomer();

    customer.awardGlobalPoints(Points.from(1000));
    const first = customer.checkAndClaimMilestones(milestones);
    expect(first.map((m) => m.id)).toEqual(['ms-bronze']);

    customer.awardGlobalPoints(Points.from(4000)); // total 5100 (1000 + 100 bonus + 4000)
    const second = customer.checkAndClaimMilestones(milestones);
    expect(second.map((m) => m.id)).toEqual(['ms-silver']);

    expect(customer.getClaimedMilestones()).toHaveLength(2);
  });

  it('serializes claimedMilestones in toJSON()', () => {
    const customer = createCustomer();
    customer.awardGlobalPoints(Points.from(1000));
    customer.checkAndClaimMilestones(milestones);

    const json = customer.toJSON();
    expect(json.claimedMilestones).toContain('ms-bronze');
  });
});
