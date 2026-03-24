import { describe, expect, it } from 'vitest';
import { Customer, PhoneNumber } from '../index';

function makeCustomer(phone = '0501234567') {
  return Customer.create(new PhoneNumber(phone), 'Test User');
}

describe('Referral Program — Domain', () => {
  it('generates a referralCode on Customer.create()', () => {
    const customer = makeCustomer();
    const code = customer.getReferralCode();
    expect(typeof code).toBe('string');
    expect(code.length).toBe(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it('each new customer gets a unique referralCode', () => {
    const a = makeCustomer('0501111111');
    const b = makeCustomer('0502222222');
    expect(a.getReferralCode()).not.toBe(b.getReferralCode());
  });

  it('starts with no referredBy', () => {
    const customer = makeCustomer();
    expect(customer.getReferredBy()).toBeUndefined();
  });

  it('setReferredBy stores the referral code', () => {
    const customer = makeCustomer();
    customer.setReferredBy('ABCD1234');
    expect(customer.getReferredBy()).toBe('ABCD1234');
  });

  it('setReferredBy is idempotent — never overwrites an existing value', () => {
    const customer = makeCustomer();
    customer.setReferredBy('FIRST111');
    customer.setReferredBy('SECOND22');
    expect(customer.getReferredBy()).toBe('FIRST111');
  });

  it('referralCode is serialised in toJSON()', () => {
    const customer = makeCustomer();
    const json = customer.toJSON();
    expect(json.referralCode).toBe(customer.getReferralCode());
  });

  it('referredBy is included in toJSON() when set', () => {
    const customer = makeCustomer();
    customer.setReferredBy('REFERRER');
    const json = customer.toJSON();
    expect(json.referredBy).toBe('REFERRER');
  });

  it('referredBy is absent from toJSON() when not set', () => {
    const customer = makeCustomer();
    const json = customer.toJSON();
    expect('referredBy' in json).toBe(false);
  });
});
