import { describe, expect, it } from 'vitest';
import { Customer, PhoneNumber, Points } from '../index';

function createCustomer() {
  return Customer.create(new PhoneNumber('0501234567'), 'Test User');
}

describe('Customer Streak Tracking', () => {
  it('should start with empty weekly visits', () => {
    const customer = createCustomer();
    expect(customer.getWeeklyVisitCount()).toBe(0);
    expect(customer.getWeeklyVisitDates()).toEqual([]);
  });

  it('should record a visit', () => {
    const customer = createCustomer();
    const date = new Date('2026-03-15T10:00:00Z');
    customer.recordVisitForStreak(date);

    expect(customer.getWeeklyVisitCount()).toBe(1);
    expect(customer.getWeeklyVisitDates()).toEqual(['2026-03-15']);
  });

  it('should deduplicate visits on the same day', () => {
    const customer = createCustomer();
    const morning = new Date('2026-03-15T09:00:00Z');
    const afternoon = new Date('2026-03-15T15:00:00Z');

    customer.recordVisitForStreak(morning);
    customer.recordVisitForStreak(afternoon);

    expect(customer.getWeeklyVisitCount()).toBe(1);
  });

  it('should count visits on different days', () => {
    const customer = createCustomer();
    customer.recordVisitForStreak(new Date('2026-03-15T10:00:00Z'));
    customer.recordVisitForStreak(new Date('2026-03-16T10:00:00Z'));
    customer.recordVisitForStreak(new Date('2026-03-17T10:00:00Z'));

    expect(customer.getWeeklyVisitCount()).toBe(3);
  });

  it('should lazy-reset streak when a new week starts (7+ days)', () => {
    const customer = createCustomer();

    // Manually set the streak start to a known date
    const day1 = new Date(Date.now() + 86400000); // tomorrow
    customer.resetWeeklyStreak(day1);
    customer.recordVisitForStreak(day1);
    expect(customer.getWeeklyVisitCount()).toBe(1);

    // Visit 8 days later — should reset
    const day8 = new Date(day1.getTime() + 8 * 86400000);
    customer.recordVisitForStreak(day8);

    expect(customer.getWeeklyVisitCount()).toBe(1);
    expect(customer.getWeeklyVisitDates()).toEqual([day8.toISOString().slice(0, 10)]);
  });

  it('should not reset streak within the same 7-day window', () => {
    const customer = createCustomer();
    const baseDate = new Date(Date.now() + 86400000);
    customer.resetWeeklyStreak(baseDate);

    customer.recordVisitForStreak(baseDate);
    customer.recordVisitForStreak(new Date(baseDate.getTime() + 2 * 86400000));
    customer.recordVisitForStreak(new Date(baseDate.getTime() + 6 * 86400000));

    expect(customer.getWeeklyVisitCount()).toBe(3);
  });

  it('should award streak bonus points', () => {
    const customer = createCustomer();
    const initialBalance = customer.getGlobalPointsBalance().toNumber();

    customer.awardStreakBonus(Points.from(500));

    expect(customer.getGlobalPointsBalance().toNumber()).toBe(initialBalance + 500);
    expect(customer.getGlobalLifetimePoints().toNumber()).toBe(initialBalance + 500);
  });

  it('should manually reset weekly streak', () => {
    const customer = createCustomer();
    customer.recordVisitForStreak(new Date('2026-03-15T10:00:00Z'));
    customer.recordVisitForStreak(new Date('2026-03-16T10:00:00Z'));

    expect(customer.getWeeklyVisitCount()).toBe(2);

    customer.resetWeeklyStreak();
    expect(customer.getWeeklyVisitCount()).toBe(0);
    expect(customer.getWeeklyVisitDates()).toEqual([]);
  });

  it('should serialize streak fields in toJSON', () => {
    const customer = createCustomer();
    customer.recordVisitForStreak(new Date('2026-03-15T10:00:00Z'));

    const json = customer.toJSON();
    expect(json.weeklyVisitDates).toEqual(['2026-03-15']);
    expect(typeof json.lastStreakResetAt).toBe('string');
  });
});
