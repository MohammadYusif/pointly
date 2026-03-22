import { describe, expect, it } from 'vitest';
import { Customer } from '../entities/Customer';
import { CustomerDecayService } from '../services/CustomerDecayService';
import { CustomerTier } from '../value-objects/CustomerTier';
import { PhoneNumber } from '../value-objects/PhoneNumber';
import { Points } from '../value-objects/Points';

const CUSTOMER_PHONE = new PhoneNumber('966512345678');

type CustomerWithProps = { props: Record<string, unknown> };

function makeCustomer(balance = 1000): Customer {
  const customer = Customer.create(CUSTOMER_PHONE);
  const props = (customer as unknown as CustomerWithProps).props;
  props.globalPointsBalance = Points.from(balance);
  return customer;
}

/** Set lastNetworkActivity to N months ago for decay testing */
function setInactiveSince(customer: Customer, monthsAgo: number): void {
  const props = (customer as unknown as CustomerWithProps).props;
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  props.lastNetworkActivity = d;
}

function setTier(customer: Customer, tier: CustomerTier): void {
  (customer as unknown as CustomerWithProps).props.currentTier = tier;
}

describe('CustomerDecayService', () => {
  const service = new CustomerDecayService();

  describe('calculateMonthlyDecay', () => {
    it('returns zero within the 12-month grace period', () => {
      const c = makeCustomer(1000);
      setInactiveSince(c, 11);
      expect(service.calculateMonthlyDecay(c).toNumber()).toBe(0);
    });

    it('returns 5% for Phase 1 (month 13)', () => {
      const c = makeCustomer(1000);
      setInactiveSince(c, 13);
      expect(service.calculateMonthlyDecay(c).toNumber()).toBe(50);
    });

    it('returns 15% for Phase 2 (month 19)', () => {
      const c = makeCustomer(1000);
      setInactiveSince(c, 19);
      expect(service.calculateMonthlyDecay(c).toNumber()).toBe(150);
    });

    it('returns zero for decay-immune tier (Gold)', () => {
      const c = makeCustomer(1000);
      setInactiveSince(c, 13);
      setTier(c, CustomerTier.gold());
      expect(service.calculateMonthlyDecay(c).toNumber()).toBe(0);
    });
  });

  describe('applyMonthlyDecay — multi-cycle correctness (V2 fix)', () => {
    it('applies exactly 5% once for a Phase 1 customer (single run)', () => {
      const c = makeCustomer(1000);
      setInactiveSince(c, 13);
      const decayed = service.applyMonthlyDecay(c);
      expect(decayed.toNumber()).toBe(50);
      expect(c.getGlobalPointsBalance().toNumber()).toBe(950);
    });

    it('compounds correctly across two consecutive Phase 1 monthly runs', () => {
      const c = makeCustomer(1000);
      setInactiveSince(c, 13);

      // Run 1: floor(1000 * 0.05) = 50 → 950
      const decay1 = service.applyMonthlyDecay(c);
      expect(decay1.toNumber()).toBe(50);
      expect(c.getGlobalPointsBalance().toNumber()).toBe(950);

      // Run 2: floor(950 * 0.05) = 47 → 903
      const decay2 = service.applyMonthlyDecay(c);
      expect(decay2.toNumber()).toBe(47);
      expect(c.getGlobalPointsBalance().toNumber()).toBe(903);
    });

    it('applies exactly 15% once for a Phase 2 customer (single run)', () => {
      const c = makeCustomer(1000);
      setInactiveSince(c, 19);
      const decayed = service.applyMonthlyDecay(c);
      expect(decayed.toNumber()).toBe(150);
      expect(c.getGlobalPointsBalance().toNumber()).toBe(850);
    });

    it('compounds correctly across three consecutive Phase 2 monthly runs', () => {
      const c = makeCustomer(1000);
      setInactiveSince(c, 19);

      // Run 1: floor(1000 * 0.15) = 150 → 850
      service.applyMonthlyDecay(c);
      expect(c.getGlobalPointsBalance().toNumber()).toBe(850);

      // Run 2: floor(850 * 0.15) = 127 → 723
      service.applyMonthlyDecay(c);
      expect(c.getGlobalPointsBalance().toNumber()).toBe(723);

      // Run 3: floor(723 * 0.15) = 108 → 615
      service.applyMonthlyDecay(c);
      expect(c.getGlobalPointsBalance().toNumber()).toBe(615);
    });

    it('does not reduce global balance for Gold tier (decay-immune)', () => {
      const c = makeCustomer(1000);
      setInactiveSince(c, 13);
      setTier(c, CustomerTier.gold());

      const decayed = service.applyMonthlyDecay(c);
      expect(decayed.toNumber()).toBe(0);
      expect(c.getGlobalPointsBalance().toNumber()).toBe(1000);
    });
  });
});
