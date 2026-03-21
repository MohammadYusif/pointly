import { describe, expect, it } from 'vitest';
import { Customer } from '../entities/Customer';
import { Transaction } from '../entities/Transaction';
import { CustomerTier, CustomerTierLevel } from '../value-objects/CustomerTier';
import { Money } from '../value-objects/Money';
import { PhoneNumber } from '../value-objects/PhoneNumber';
import { Points } from '../value-objects/Points';

/**
 * Comprehensive Point System Tests
 *
 * These tests cover all 7 requirements from the domain layer audit:
 * 1. Zombie Point Cleanup (Fix #1)
 * 2. Gradual Tier Demotion (Fix #2)
 * 3. Lazy Monthly Reset (Fix #3)
 * 4. Safe Tier Incentives (Fix #4)
 * 5. Redemption Validation (Fix #5)
 * 6. Config Cleanup (Fix #6) - covered in Merchant tests
 * 7. Smart Redemption (Fix #7)
 *
 * Plus robustness improvements:
 * - Zero-point validation
 * - Negative validation
 * - Consent error messaging
 * - UTC timezone handling
 */

// Helper to create a customer with enrollment
function createCustomerWithEnrollment(merchantId = 'merchant_123') {
  const phone = new PhoneNumber('0501234567');
  const customer = Customer.create(phone, 'Test Customer');
  customer.enrollWithMerchant(merchantId);
  customer.grantConsent(merchantId);
  return customer;
}

// Test helpers that access private props for test setup
// Using type assertion to access private Customer props for testing purposes
type CustomerWithProps = { props: Record<string, unknown> };

// Helper to manually set customer's last activity date for decay testing
function setLastActivityDate(customer: Customer, monthsAgo: number): void {
  const props = (customer as unknown as CustomerWithProps).props;
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  props.lastNetworkActivity = date;
}

// Helper to manually set monthly progress reset date for lazy reset testing
function setMonthlyProgressResetDate(customer: Customer, date: Date): void {
  const props = (customer as unknown as CustomerWithProps).props;
  props.monthlyProgressResetAt = date;
}

// Helper to manually set customer tier
function setCustomerTier(customer: Customer, tier: CustomerTier): void {
  const props = (customer as unknown as CustomerWithProps).props;
  props.currentTier = tier;
}

// Helper to manually set global points balance
function setGlobalPointsBalance(customer: Customer, points: number): void {
  const props = (customer as unknown as CustomerWithProps).props;
  props.globalPointsBalance = Points.from(points);
}

// Helper to manually set merchant points balance
function setMerchantPointsBalance(customer: Customer, merchantId: string, points: number): void {
  const props = (customer as unknown as CustomerWithProps).props;
  const enrollment = (props.enrollments as Map<string, { merchantPointsBalance: Points }>).get(
    merchantId,
  );
  if (enrollment) {
    enrollment.merchantPointsBalance = Points.from(points);
  }
}

// Helper to manually set monthly progress
function setMonthlyProgress(customer: Customer, points: number): void {
  const props = (customer as unknown as CustomerWithProps).props;
  props.monthlyProgress = Points.from(points);
}

describe('Point System - Real World Scenarios', () => {
  /**
   * ============================================
   * FIX #7: SMART REDEMPTION (Merchant-First)
   * ============================================
   */
  describe('Smart Redemption (Fix #7)', () => {
    describe('Scenario: Coffee shop customer redeems points', () => {
      it('should use merchant points first when sufficient', () => {
        // Setup: Customer has 500 merchant points and 1000 global points at "Café Riyadh"
        const customer = createCustomerWithEnrollment('cafe_riyadh');
        setMerchantPointsBalance(customer, 'cafe_riyadh', 500);
        setGlobalPointsBalance(customer, 1000);

        // Action: Customer redeems 300 points for a free drink
        const result = customer.redeemSmart('cafe_riyadh', Points.from(300));

        // Assert: Only merchant points were used
        expect(result.merchantPointsUsed.toNumber()).toBe(300);
        expect(result.globalPointsUsed.toNumber()).toBe(0);
        expect(customer.getMerchantPointsBalance('cafe_riyadh').toNumber()).toBe(200);
        expect(customer.getGlobalPointsBalance().toNumber()).toBe(1000);
      });

      it('should drain merchant points then use global when insufficient', () => {
        // Setup: Customer has 400 merchant points and 1000 global points
        const customer = createCustomerWithEnrollment('cafe_riyadh');
        setMerchantPointsBalance(customer, 'cafe_riyadh', 400);
        setGlobalPointsBalance(customer, 1000);

        // Action: Customer redeems 1000 points for a large order
        const result = customer.redeemSmart('cafe_riyadh', Points.from(1000));

        // Assert: Merchant drained to 0, then global used for remainder
        expect(result.merchantPointsUsed.toNumber()).toBe(400);
        expect(result.globalPointsUsed.toNumber()).toBe(600);
        expect(customer.getMerchantPointsBalance('cafe_riyadh').toNumber()).toBe(0);
        expect(customer.getGlobalPointsBalance().toNumber()).toBe(400);
      });

      it('should use only global points when no merchant balance', () => {
        // Setup: Customer has 0 merchant points and 500 global points
        const customer = createCustomerWithEnrollment('cafe_riyadh');
        setMerchantPointsBalance(customer, 'cafe_riyadh', 0);
        setGlobalPointsBalance(customer, 500);

        // Action: Customer redeems 200 points
        const result = customer.redeemSmart('cafe_riyadh', Points.from(200));

        // Assert: Only global points used
        expect(result.merchantPointsUsed.toNumber()).toBe(0);
        expect(result.globalPointsUsed.toNumber()).toBe(200);
        expect(customer.getGlobalPointsBalance().toNumber()).toBe(300);
      });

      it('should fail when total points insufficient', () => {
        // Setup: Customer has 200 merchant + 100 global = 300 total
        const customer = createCustomerWithEnrollment('cafe_riyadh');
        setMerchantPointsBalance(customer, 'cafe_riyadh', 200);
        setGlobalPointsBalance(customer, 100);

        // Action & Assert: Trying to redeem 500 should fail
        expect(() => {
          customer.redeemSmart('cafe_riyadh', Points.from(500));
        }).toThrow('Insufficient total points balance');
      });

      it('should work at a new merchant using only global points', () => {
        // Setup: Customer has global points but never visited "New Store"
        const customer = createCustomerWithEnrollment('old_store');
        setGlobalPointsBalance(customer, 1000);

        // Enroll at new store
        customer.enrollWithMerchant('new_store');
        customer.grantConsent('new_store');

        // Action: Redeem at new store (no merchant points there)
        const result = customer.redeemSmart('new_store', Points.from(300));

        // Assert: Only global points used since merchant balance is 0
        expect(result.merchantPointsUsed.toNumber()).toBe(0);
        expect(result.globalPointsUsed.toNumber()).toBe(300);
      });
    });

    describe('Edge Cases', () => {
      it('should reject zero-point redemption', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setGlobalPointsBalance(customer, 1000);

        expect(() => {
          customer.redeemSmart('merchant_123', Points.from(0));
        }).toThrow('Points to redeem must be greater than zero');
      });

      it('should handle exact balance redemption', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setMerchantPointsBalance(customer, 'merchant_123', 500);
        setGlobalPointsBalance(customer, 500);

        // Redeem exactly total balance
        const result = customer.redeemSmart('merchant_123', Points.from(1000));

        expect(result.merchantPointsUsed.toNumber()).toBe(500);
        expect(result.globalPointsUsed.toNumber()).toBe(500);
        expect(customer.getMerchantPointsBalance('merchant_123').toNumber()).toBe(0);
        expect(customer.getGlobalPointsBalance().toNumber()).toBe(0);
      });

      it('should fail for inactive customer', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setGlobalPointsBalance(customer, 1000);
        customer.deactivate();

        expect(() => {
          customer.redeemSmart('merchant_123', Points.from(100));
        }).toThrow('Customer must be active to redeem points');
      });

      it('should use merchant points first in smart redemption', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setMerchantPointsBalance(customer, 'merchant_123', 500);
        setGlobalPointsBalance(customer, 1000);

        const result = customer.redeemSmart('merchant_123', Points.from(300));

        expect(result.merchantPointsUsed.toNumber()).toBe(300);
        expect(result.globalPointsUsed.toNumber()).toBe(0);
      });
    });
  });

  /**
   * ============================================
   * FIX #1: ZOMBIE POINT CLEANUP
   * ============================================
   */
  describe('Zombie Point Cleanup (Fix #1)', () => {
    describe('Scenario: Long-inactive customer returns after 8 months', () => {
      it('should wipe merchant points for Bronze user in Phase 2', () => {
        // Setup: Bronze customer inactive for 7 months with points at multiple merchants
        const customer = createCustomerWithEnrollment('merchant_a');
        customer.enrollWithMerchant('merchant_b');
        customer.grantConsent('merchant_b');

        setMerchantPointsBalance(customer, 'merchant_a', 500);
        setMerchantPointsBalance(customer, 'merchant_b', 300);
        setGlobalPointsBalance(customer, 1000);
        setLastActivityDate(customer, 18); // 18 months inactive = Phase 2

        // Action: Apply decay
        const decayAmount = customer.applyGlobalPointsDecay();

        // Assert: Global points decayed AND merchant points wiped
        expect(decayAmount.toNumber()).toBeGreaterThan(0);
        expect(customer.getMerchantPointsBalance('merchant_a').toNumber()).toBe(0);
        expect(customer.getMerchantPointsBalance('merchant_b').toNumber()).toBe(0);
      });

      it('should wipe merchant points for Gold user in Phase 2 (decay immune keeps global)', () => {
        // Setup: Gold customer (decay immune) inactive for 7 months
        const customer = createCustomerWithEnrollment('merchant_123');
        setCustomerTier(customer, CustomerTier.gold());
        setMerchantPointsBalance(customer, 'merchant_123', 800);
        setGlobalPointsBalance(customer, 5000);
        setLastActivityDate(customer, 18); // Phase 2

        // Action: Apply decay
        const decayAmount = customer.applyGlobalPointsDecay();

        // Assert: Global points preserved (decay immune), but merchant points wiped
        expect(decayAmount.toNumber()).toBe(0); // No global decay for Gold
        expect(customer.getGlobalPointsBalance().toNumber()).toBe(5000);
        expect(customer.getMerchantPointsBalance('merchant_123').toNumber()).toBe(0); // Wiped!
      });

      it('should wipe merchant points for Diamond user in Phase 2', () => {
        // Setup: Diamond customer inactive for 8 months
        const customer = createCustomerWithEnrollment('merchant_123');
        setCustomerTier(customer, CustomerTier.diamond());
        setMerchantPointsBalance(customer, 'merchant_123', 1500);
        setGlobalPointsBalance(customer, 20000);
        setLastActivityDate(customer, 19); // Phase 2

        // Action: Apply decay
        customer.applyGlobalPointsDecay();

        // Assert: Global preserved, merchant wiped
        expect(customer.getGlobalPointsBalance().toNumber()).toBe(20000);
        expect(customer.getMerchantPointsBalance('merchant_123').toNumber()).toBe(0);
      });
    });

    describe('Active users should NOT lose merchant points', () => {
      it('should preserve merchant points in Phase 0 (active)', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setMerchantPointsBalance(customer, 'merchant_123', 500);
        setGlobalPointsBalance(customer, 1000);
        // Recently active (default) = Phase 0

        customer.applyGlobalPointsDecay();

        expect(customer.getMerchantPointsBalance('merchant_123').toNumber()).toBe(500);
      });

      it('should preserve merchant points in Phase 1 (light decay)', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setMerchantPointsBalance(customer, 'merchant_123', 500);
        setGlobalPointsBalance(customer, 1000);
        setLastActivityDate(customer, 13); // 13 months = Phase 1

        customer.applyGlobalPointsDecay();

        // Global may decay, but merchant points preserved
        expect(customer.getMerchantPointsBalance('merchant_123').toNumber()).toBe(500);
      });
    });

    describe('Decay Edge Cases', () => {
      it('should handle small balance decay: 10 points at Phase 1 (13 months)', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setGlobalPointsBalance(customer, 10);
        setLastActivityDate(customer, 13); // 13 months = 1 month in Phase 1

        const decayAmount = customer.calculateDecayAmount();

        // 10 * 0.95 = 9.5, floor = 9, decay = 1 (or 0 depending on rounding)
        expect(decayAmount.toNumber()).toBeGreaterThanOrEqual(0);
        expect(decayAmount.toNumber()).toBeLessThanOrEqual(1);
      });

      it('should handle zero global points decay at Phase 1', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setGlobalPointsBalance(customer, 0);
        setLastActivityDate(customer, 13); // Phase 1

        const decayAmount = customer.calculateDecayAmount();

        expect(decayAmount.toNumber()).toBe(0);
      });

      it('should start Phase 1 at exactly 12 months of inactivity', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setGlobalPointsBalance(customer, 1000);
        setLastActivityDate(customer, 12); // Exactly 12 months

        const phase = customer.calculateDecayPhase();

        expect(phase).toBe(1); // Phase 1 starts at month 12
      });

      it('should start Phase 2 at exactly 18 months of inactivity', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setGlobalPointsBalance(customer, 1000);
        setLastActivityDate(customer, 18); // Exactly 18 months

        const phase = customer.calculateDecayPhase();

        expect(phase).toBe(2); // Phase 2 starts at month 18
      });

      it('should compound decay when applied twice', () => {
        // First application
        const customer1 = createCustomerWithEnrollment('merchant_123');
        setGlobalPointsBalance(customer1, 1000);
        setLastActivityDate(customer1, 13); // Phase 1

        const firstDecay = customer1.applyGlobalPointsDecay();
        const balanceAfterFirst = customer1.getGlobalPointsBalance().toNumber();

        // Second application (simulate continued inactivity)
        setLastActivityDate(customer1, 13); // Still Phase 1 after time passes
        const secondDecay = customer1.applyGlobalPointsDecay();
        const balanceAfterSecond = customer1.getGlobalPointsBalance().toNumber();

        // Balance should keep decreasing
        expect(balanceAfterFirst).toBeLessThan(1000);
        expect(balanceAfterSecond).toBeLessThan(balanceAfterFirst);
        expect(firstDecay.toNumber()).toBeGreaterThan(0);
        expect(secondDecay.toNumber()).toBeGreaterThan(0);
      });

      it('should return undefined decay start date for active customer', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        // Default customer is freshly created / active
        customer.addPointsFromPurchase('merchant_123', Points.from(10), Points.from(10));

        expect(customer.getDecayStartDate()).toBeUndefined();
      });

      it('should return 0 months of inactivity for recently active customer', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        // Just created, last activity is now
        setLastActivityDate(customer, 0);

        expect(customer.getMonthsOfInactivity()).toBe(0);
      });
    });

    describe('Decay phases and rates', () => {
      it('should apply 5% decay per month in Phase 1 (months 12-17)', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setGlobalPointsBalance(customer, 1000);
        setLastActivityDate(customer, 13); // 13 months = 1 month in Phase 1

        const decayAmount = customer.calculateDecayAmount();

        // 1 month at 5%: 1000 * 0.95 = 950, decay = 50
        expect(decayAmount.toNumber()).toBe(50);
      });

      it('should apply compounded decay in Phase 2 (month 18+)', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setGlobalPointsBalance(customer, 1000);
        setLastActivityDate(customer, 19); // 19 months = 6 months Phase 1 + 1 month Phase 2

        const decayAmount = customer.calculateDecayAmount();

        // 6 months at 5%: 1000 * 0.95^6 = 735 (approx)
        // 1 month at 15%: 735 * 0.85 = 625 (approx)
        // Decay = 1000 - 625 = 375
        expect(decayAmount.toNumber()).toBeGreaterThan(340);
        expect(decayAmount.toNumber()).toBeLessThan(410);
      });

      it('should apply zero decay for decay-immune tiers', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setCustomerTier(customer, CustomerTier.gold());
        setGlobalPointsBalance(customer, 1000);
        setLastActivityDate(customer, 13); // Would be Phase 1 for Bronze

        const decayAmount = customer.calculateDecayAmount();

        expect(decayAmount.toNumber()).toBe(0);
      });
    });
  });

  /**
   * ============================================
   * FIX #2: GRADUAL TIER DEMOTION
   * ============================================
   */
  describe('Gradual Tier Demotion (Fix #2)', () => {
    describe('Scenario: Diamond customer has a slow month', () => {
      it('should drop Diamond to Platinum (not Bronze) on first failure', () => {
        const customer = createCustomerWithEnrollment('merchant_123');

        // Setup: Diamond tier with reset monthly progress
        setCustomerTier(customer, CustomerTier.diamond());
        customer.resetMonthlyProgress();

        // Earn only 3,000 points (below Diamond's 15,000 threshold)
        customer.addPointsFromPurchase('merchant_123', Points.from(3000), Points.from(3000));

        // Action: End of month tier evaluation
        const newTier = customer.updateTierFromProgress();

        // Assert: Dropped one level only (Diamond → Platinum)
        expect(newTier.getLevel()).toBe(CustomerTierLevel.PLATINUM);
        expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.PLATINUM);
      });

      it('should drop Gold to Bronze on consecutive failure', () => {
        const customer = createCustomerWithEnrollment('merchant_123');

        // Setup: Gold tier
        setCustomerTier(customer, CustomerTier.gold());
        customer.resetMonthlyProgress();

        // Earn only 2,000 points (below Gold's 5,000 threshold)
        customer.addPointsFromPurchase('merchant_123', Points.from(2000), Points.from(2000));

        // Action: Tier evaluation
        const newTier = customer.updateTierFromProgress();

        // Assert: Dropped to Bronze
        expect(newTier.getLevel()).toBe(CustomerTierLevel.BRONZE);
      });

      it('should maintain tier if requirements met', () => {
        const customer = createCustomerWithEnrollment('merchant_123');

        // Setup: Gold tier
        setCustomerTier(customer, CustomerTier.gold());
        customer.resetMonthlyProgress();

        // Earn 6,000 points (above Gold's 5,000 threshold)
        customer.addPointsFromPurchase('merchant_123', Points.from(6000), Points.from(6000));

        // Action: Tier evaluation
        const newTier = customer.updateTierFromProgress();

        // Assert: Stays Gold
        expect(newTier.getLevel()).toBe(CustomerTierLevel.GOLD);
      });

      it('should not drop below Bronze', () => {
        const customer = createCustomerWithEnrollment('merchant_123');

        // Setup: Already Bronze
        setCustomerTier(customer, CustomerTier.bronze());
        customer.resetMonthlyProgress();
        // No points earned

        // Action: Tier evaluation
        const newTier = customer.updateTierFromProgress();

        // Assert: Stays Bronze (can't go lower)
        expect(newTier.getLevel()).toBe(CustomerTierLevel.BRONZE);
      });
    });

    describe('CustomerTier.decay() behavior', () => {
      it('should decay tiers one level at a time', () => {
        expect(CustomerTier.diamond().decay().getLevel()).toBe(CustomerTierLevel.PLATINUM);
        expect(CustomerTier.platinum().decay().getLevel()).toBe(CustomerTierLevel.GOLD);
        expect(CustomerTier.gold().decay().getLevel()).toBe(CustomerTierLevel.BRONZE);
        expect(CustomerTier.bronze().decay().getLevel()).toBe(CustomerTierLevel.BRONZE);
      });
    });
  });

  /**
   * ============================================
   * FIX #3: LAZY MONTHLY RESET
   * ============================================
   */
  describe('Lazy Monthly Reset (Fix #3)', () => {
    describe('Scenario: Cron job missed, customer makes purchase in new month', () => {
      it('should auto-reset monthly progress before adding new points', () => {
        const customer = createCustomerWithEnrollment('merchant_123');

        // Setup: Customer had progress last month
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        setMonthlyProgressResetDate(customer, lastMonth);

        // Manually set some progress from "last month"
        setMonthlyProgress(customer, 8000);

        // Action: Make a purchase in the new month
        customer.addPointsFromPurchase('merchant_123', Points.from(100), Points.from(100));

        // Assert: Progress was reset before adding, so only new points count
        expect(customer.getMonthlyProgress().toNumber()).toBe(100);
      });

      it('should not reset progress for same-month purchase', () => {
        const customer = createCustomerWithEnrollment('merchant_123');

        // Setup: Reset happened today (same month)
        const today = new Date();
        setMonthlyProgressResetDate(customer, today);

        // First purchase
        customer.addPointsFromPurchase('merchant_123', Points.from(500), Points.from(500));
        expect(customer.getMonthlyProgress().toNumber()).toBe(500);

        // Second purchase same month
        customer.addPointsFromPurchase('merchant_123', Points.from(300), Points.from(300));

        // Assert: Progress accumulated
        expect(customer.getMonthlyProgress().toNumber()).toBe(800);
      });

      it('should handle year boundary correctly', () => {
        const customer = createCustomerWithEnrollment('merchant_123');

        // Setup: Last reset was December last year
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        lastYear.setMonth(11); // December
        setMonthlyProgressResetDate(customer, lastYear);

        setMonthlyProgress(customer, 5000);

        // Action: Purchase in January this year
        customer.addPointsFromPurchase('merchant_123', Points.from(200), Points.from(200));

        // Assert: Reset happened
        expect(customer.getMonthlyProgress().toNumber()).toBe(200);
      });
    });
  });

  /**
   * ============================================
   * FIX #4: SAFE TIER INCENTIVES (Earning Multiplier)
   * ============================================
   */
  describe('Safe Tier Incentives (Fix #4)', () => {
    describe('Earning Multiplier', () => {
      it('should apply 1.0x multiplier for Bronze', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.BRONZE);

        // Earn 1000 base points
        customer.addPointsFromPurchase('merchant_123', Points.from(1000), Points.from(500));

        // Assert: 1000 * 1.0 = 1000
        expect(customer.getGlobalPointsBalance().toNumber()).toBe(1000);
        expect(customer.getMonthlyProgress().toNumber()).toBe(1000);
      });

      it('should apply 1.1x multiplier for Gold', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setCustomerTier(customer, CustomerTier.gold());

        // Earn 1000 base points
        customer.addPointsFromPurchase('merchant_123', Points.from(1000), Points.from(500));

        // Assert: balance gets 1000 * 1.1 = 1100, monthly progress tracks raw 1000
        expect(customer.getGlobalPointsBalance().toNumber()).toBe(1100);
        expect(customer.getMonthlyProgress().toNumber()).toBe(1000);
      });

      it('should apply 1.2x multiplier for Diamond', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setCustomerTier(customer, CustomerTier.diamond());

        // Earn 1000 base points
        customer.addPointsFromPurchase('merchant_123', Points.from(1000), Points.from(500));

        // Assert: balance gets 1000 * 1.2 = 1200, monthly progress tracks raw 1000
        expect(customer.getGlobalPointsBalance().toNumber()).toBe(1200);
        expect(customer.getMonthlyProgress().toNumber()).toBe(1000);
      });

      it('should floor fractional points from multiplier', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setCustomerTier(customer, CustomerTier.gold());

        // Earn 99 base points: 99 * 1.1 = 108.9 → 108
        customer.addPointsFromPurchase('merchant_123', Points.from(99), Points.from(50));

        expect(customer.getGlobalPointsBalance().toNumber()).toBe(108);
      });

      it('should apply 1.15x multiplier for Platinum without floating-point error', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setCustomerTier(customer, CustomerTier.platinum());

        // 100 * 1.15 = 115 (NOT 114 from IEEE 754 Math.floor bug)
        customer.addPointsFromPurchase('merchant_123', Points.from(100), Points.from(50));

        expect(customer.getGlobalPointsBalance().toNumber()).toBe(115);
      });

      it('should apply 1.2x multiplier for Diamond without floating-point error', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setCustomerTier(customer, CustomerTier.diamond());

        // 100 * 1.2 = 120 (NOT 119 from IEEE 754 Math.floor bug)
        customer.addPointsFromPurchase('merchant_123', Points.from(100), Points.from(50));

        expect(customer.getGlobalPointsBalance().toNumber()).toBe(120);
      });

      it('should floor fractional Platinum points correctly', () => {
        const customer = createCustomerWithEnrollment('merchant_123');
        setCustomerTier(customer, CustomerTier.platinum());

        // 99 * 1.15 = 113.85 → 113
        customer.addPointsFromPurchase('merchant_123', Points.from(99), Points.from(50));

        expect(customer.getGlobalPointsBalance().toNumber()).toBe(113);
      });
    });

    describe('Decay Immunity', () => {
      it('should make Bronze tier subject to decay', () => {
        expect(CustomerTier.bronze().isDecayImmune()).toBe(false);
      });

      it('should make Gold tier immune to decay', () => {
        expect(CustomerTier.gold().isDecayImmune()).toBe(true);
      });

      it('should make Diamond tier immune to decay', () => {
        expect(CustomerTier.diamond().isDecayImmune()).toBe(true);
      });
    });

    describe('No redemption multiplier (removed)', () => {
      it('should not have redemptionMultiplier property', () => {
        const tier = CustomerTier.diamond();
        const thresholds = tier.getThresholds();

        expect(thresholds).not.toHaveProperty('redemptionMultiplier');
        expect(thresholds).toHaveProperty('earningMultiplier');
        expect(thresholds).toHaveProperty('decays');
      });
    });
  });

  /**
   * ============================================
   * FIX #5: REDEMPTION VALIDATION (Theft Prevention)
   * ============================================
   */
  describe('Redemption Validation (Fix #5)', () => {
    describe('Scenario: Preventing point-to-cash theft', () => {
      it('should block redemption where 1 point > 0.50 SAR', () => {
        // Attacker tries to redeem 100 points for 100 SAR (1 SAR per point!)
        expect(() => {
          Transaction.createRedeem(
            'merchant_123',
            'customer_123',
            Points.from(100),
            Money.fromSAR(100), // 1 SAR per point - theft attempt!
            Points.from(1000),
            'idempotency_key',
          );
        }).toThrow(/exceeds maximum allowed 0.5 SAR\/point/);
      });

      it('should allow redemption at 0.01 SAR per point (normal rate)', () => {
        // Normal: 100 points for 1 SAR (0.01 SAR per point)
        const transaction = Transaction.createRedeem(
          'merchant_123',
          'customer_123',
          Points.from(100),
          Money.fromSAR(1),
          Points.from(1000),
          'idempotency_key',
        );

        expect(transaction.getPoints().toNumber()).toBe(100);
        expect(transaction.getAmount()?.toSAR()).toBe(1);
      });

      it('should allow redemption at exactly 0.50 SAR per point (edge case)', () => {
        // Edge: 100 points for 50 SAR (0.50 SAR per point - max allowed)
        const transaction = Transaction.createRedeem(
          'merchant_123',
          'customer_123',
          Points.from(100),
          Money.fromSAR(50),
          Points.from(1000),
          'idempotency_key',
        );

        expect(transaction).toBeDefined();
      });

      it('should block redemption at 0.51 SAR per point', () => {
        // Just over limit: 100 points for 51 SAR (0.51 SAR per point)
        expect(() => {
          Transaction.createRedeem(
            'merchant_123',
            'customer_123',
            Points.from(100),
            Money.fromSAR(51),
            Points.from(1000),
            'idempotency_key',
          );
        }).toThrow(/exceeds maximum allowed/);
      });

      it('should validate expected rate when provided', () => {
        // Merchant expects 0.01 SAR/point but transaction has 0.02
        expect(() => {
          Transaction.createRedeem(
            'merchant_123',
            'customer_123',
            Points.from(100),
            Money.fromSAR(2), // 0.02 SAR/point
            Points.from(1000),
            'idempotency_key',
            {},
            0.01, // Expected rate
          );
        }).toThrow(/Redemption rate mismatch/);
      });
    });

    describe('Redemption Edge Cases', () => {
      it('should allow redeeming 1 point for 0.01 SAR (normal rate)', () => {
        const transaction = Transaction.createRedeem(
          'merchant_123',
          'customer_123',
          Points.from(1),
          Money.fromSAR(0.01),
          Points.from(100),
          'idempotency_key',
        );

        expect(transaction).toBeDefined();
        expect(transaction.getPoints().toNumber()).toBe(1);
      });

      it('should allow redeeming 1 point for 0.50 SAR (exactly at limit)', () => {
        const transaction = Transaction.createRedeem(
          'merchant_123',
          'customer_123',
          Points.from(1),
          Money.fromSAR(0.5),
          Points.from(100),
          'idempotency_key',
        );

        expect(transaction).toBeDefined();
      });

      it('should reject redeeming 1 point for 0.51 SAR (over limit)', () => {
        expect(() => {
          Transaction.createRedeem(
            'merchant_123',
            'customer_123',
            Points.from(1),
            Money.fromSAR(0.51),
            Points.from(100),
            'idempotency_key',
          );
        }).toThrow(/exceeds maximum allowed/);
      });

      it('should reject earn with zero points', () => {
        expect(() => {
          Transaction.createEarn(
            'merchant_123',
            'customer_123',
            Points.from(0),
            Money.fromSAR(10),
            Points.from(100),
            'idempotency_key',
          );
        }).toThrow('Points must be greater than zero');
      });

      it('should reject adjustment with zero points', () => {
        expect(() => {
          Transaction.createAdjustment(
            'merchant_123',
            'customer_123',
            Points.from(0),
            Points.from(100),
            true,
            'idempotency_key',
          );
        }).toThrow('Points must be greater than zero');
      });

      it('should reject expiration with zero points', () => {
        expect(() => {
          Transaction.createExpiration(
            'SYSTEM',
            'customer_123',
            Points.from(0),
            Points.from(100),
            'idempotency_key',
          );
        }).toThrow('Points must be greater than zero');
      });
    });

    describe('Transaction validation edge cases', () => {
      it('should reject zero points redemption', () => {
        expect(() => {
          Transaction.createRedeem(
            'merchant_123',
            'customer_123',
            Points.from(0),
            Money.fromSAR(10),
            Points.from(1000),
            'idempotency_key',
          );
        }).toThrow('Points must be greater than zero');
      });

      it('should reject insufficient balance', () => {
        expect(() => {
          Transaction.createRedeem(
            'merchant_123',
            'customer_123',
            Points.from(500),
            Money.fromSAR(5),
            Points.from(100), // Only 100 available
            'idempotency_key',
          );
        }).toThrow('Insufficient points balance');
      });
    });
  });

  /**
   * ============================================
   * ROBUSTNESS IMPROVEMENTS
   * ============================================
   */
  describe('Robustness Improvements', () => {
    describe('Negative validation in CustomerTier.fromMonthlyProgress()', () => {
      it('should reject negative monthly points', () => {
        expect(() => {
          CustomerTier.fromMonthlyProgress(-100);
        }).toThrow('Monthly points cannot be negative');
      });

      it('should accept zero monthly points', () => {
        const tier = CustomerTier.fromMonthlyProgress(0);
        expect(tier.getLevel()).toBe(CustomerTierLevel.BRONZE);
      });
    });

    describe('Points value object validation', () => {
      it('should reject negative points', () => {
        expect(() => Points.from(-1)).toThrow('Points cannot be negative');
      });

      it('should reject non-integer points', () => {
        expect(() => Points.from(10.5)).toThrow('Points must be an integer');
      });

      it('should reject infinite points', () => {
        // Infinity is not an integer, so integer check triggers first
        expect(() => Points.from(Number.POSITIVE_INFINITY)).toThrow('Points must be an integer');
      });
    });
  });

  /**
   * ============================================
   * TIER UPGRADE DURING PURCHASE
   * ============================================
   */
  describe('Tier Upgrade During Purchase', () => {
    it('should upgrade to Gold when crossing 5000 monthly threshold', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      // Setup: Bronze with 4500 monthly progress
      setMonthlyProgress(customer, 4500);
      setGlobalPointsBalance(customer, 4500);

      // Reset monthly progress tracking date to current month so lazy reset doesn't trigger
      setMonthlyProgressResetDate(customer, new Date());

      // Action: Earn 600 points → 4500 + 600 = 5100 → crosses 5000
      customer.addPointsFromPurchase('merchant_123', Points.from(600), Points.from(600));

      // Assert: Upgraded to Gold
      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.GOLD);
      expect(customer.getMonthlyProgress().toNumber()).toBe(5100);
    });

    it('should upgrade to Diamond when crossing 15000 monthly threshold', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setCustomerTier(customer, CustomerTier.gold());
      setMonthlyProgress(customer, 14800);
      setGlobalPointsBalance(customer, 14800);
      setMonthlyProgressResetDate(customer, new Date());

      // Action: Earn 300 raw points → 14800 + 300 = 15100 → crosses 15000
      customer.addPointsFromPurchase('merchant_123', Points.from(300), Points.from(300));

      // Assert: Upgraded to Diamond
      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.DIAMOND);
    });

    it('should stay Bronze when below 5000 threshold', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setMonthlyProgress(customer, 4000);
      setGlobalPointsBalance(customer, 4000);
      setMonthlyProgressResetDate(customer, new Date());

      // Action: Earn 500 points → 4000 + 500 = 4500 → below 5000
      customer.addPointsFromPurchase('merchant_123', Points.from(500), Points.from(500));

      // Assert: Still Bronze
      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(customer.getMonthlyProgress().toNumber()).toBe(4500);
    });

    it('should apply higher multiplier after mid-purchase tier upgrade', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setMonthlyProgress(customer, 4500);
      setGlobalPointsBalance(customer, 4500);
      setMonthlyProgressResetDate(customer, new Date());

      // First purchase: Bronze (1.0x) → earns 600 → crosses 5000 → upgrades to Gold
      customer.addPointsFromPurchase('merchant_123', Points.from(600), Points.from(600));
      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.GOLD);

      // Second purchase: Now Gold (1.1x) → 100 base → 110 balance, raw 100 for progress
      customer.addPointsFromPurchase('merchant_123', Points.from(100), Points.from(100));
      // Monthly progress tracks raw: 4500 + 600 + 100 = 5200
      expect(customer.getMonthlyProgress().toNumber()).toBe(5200);
    });
  });

  /**
   * ============================================
   * CONSENT MECHANICS
   * ============================================
   */
  describe('Enrollment — auto-granted consent', () => {
    it('should auto-grant consent on enrollment and allow earning immediately', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone, 'Test Customer');
      customer.enrollWithMerchant('merchant_123');

      // Should work immediately — consent is auto-granted
      customer.addPointsFromPurchase('merchant_123', Points.from(100), Points.from(100));
      expect(customer.getGlobalPointsBalance().toNumber()).toBe(100);
      expect(customer.getMerchantPointsBalance('merchant_123').toNumber()).toBe(100);
    });

    it('should allow earning at multiple merchants independently', () => {
      const customer = createCustomerWithEnrollment('merchant_a');
      customer.enrollWithMerchant('merchant_b');

      customer.addPointsFromPurchase('merchant_a', Points.from(100), Points.from(100));
      customer.addPointsFromPurchase('merchant_b', Points.from(200), Points.from(200));
      expect(customer.getMerchantPointsBalance('merchant_a').toNumber()).toBe(100);
      expect(customer.getMerchantPointsBalance('merchant_b').toNumber()).toBe(200);
    });
  });

  /**
   * ============================================
   * CUSTOMER STATUS EFFECTS
   * ============================================
   */
  describe('Customer Status Effects', () => {
    it('should prevent suspended customer from redeeming global points', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setGlobalPointsBalance(customer, 1000);
      customer.suspend();

      expect(() => {
        customer.redeemGlobalPoints(Points.from(100));
      }).toThrow('Customer must be active to redeem points');
    });

    it('should prevent deactivated customer from redeeming via redeemSmart', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setGlobalPointsBalance(customer, 1000);
      setMerchantPointsBalance(customer, 'merchant_123', 500);
      customer.deactivate();

      expect(() => {
        customer.redeemSmart('merchant_123', Points.from(100));
      }).toThrow('Customer must be active to redeem points');
    });

    it('should prevent deactivated customer from enrolling with merchant', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone, 'Test Customer');
      customer.deactivate();

      expect(() => {
        customer.enrollWithMerchant('new_merchant');
      }).toThrow('Customer must be active to enroll');
    });

    it('should allow active customer to perform all operations normally', () => {
      const customer = createCustomerWithEnrollment('merchant_123');

      // Earn points
      customer.addPointsFromPurchase('merchant_123', Points.from(500), Points.from(500));
      expect(customer.getGlobalPointsBalance().toNumber()).toBe(500);

      // Redeem global points
      customer.redeemGlobalPoints(Points.from(100));
      expect(customer.getGlobalPointsBalance().toNumber()).toBe(400);

      // Smart redeem
      const result = customer.redeemSmart('merchant_123', Points.from(200));
      expect(result.merchantPointsUsed.toNumber() + result.globalPointsUsed.toNumber()).toBe(200);

      // Enroll with new merchant
      customer.enrollWithMerchant('another_merchant');
      customer.grantConsent('another_merchant');
      customer.addPointsFromPurchase('another_merchant', Points.from(100), Points.from(100));
      expect(customer.getMerchantPointsBalance('another_merchant').toNumber()).toBe(100);
    });
  });

  /**
   * ============================================
   * FIX: SUSPENDED/INACTIVE CUSTOMER CANNOT REDEEM MERCHANT POINTS
   * ============================================
   */
  describe('Customer Status Guard on redeemMerchantPoints', () => {
    it('should prevent a suspended customer from redeeming merchant points', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      customer.addPointsFromPurchase('merchant_123', Points.from(200), Points.from(100));
      customer.suspend();

      expect(() => {
        customer.redeemMerchantPoints('merchant_123', Points.from(50));
      }).toThrow('Customer must be active to redeem points');
    });

    it('should prevent an inactive customer from redeeming merchant points', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      customer.addPointsFromPurchase('merchant_123', Points.from(200), Points.from(100));
      customer.deactivate();

      expect(() => {
        customer.redeemMerchantPoints('merchant_123', Points.from(50));
      }).toThrow('Customer must be active to redeem points');
    });

    it('should allow an active customer to redeem merchant points normally', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      customer.addPointsFromPurchase('merchant_123', Points.from(200), Points.from(100));

      customer.redeemMerchantPoints('merchant_123', Points.from(50));

      expect(customer.getMerchantPointsBalance('merchant_123').toNumber()).toBe(50);
    });
  });

  /**
   * ============================================
   * FIX: WELCOME BONUS
   * ============================================
   */
  describe('Welcome Bonus (applyWelcomeBonus)', () => {
    it('should add global and merchant points on first call', () => {
      const customer = createCustomerWithEnrollment('merchant_123');

      customer.applyWelcomeBonus('merchant_123', Points.from(50), Points.from(50));

      expect(customer.getGlobalPointsBalance().toNumber()).toBe(50);
      expect(customer.getGlobalLifetimePoints().toNumber()).toBe(50);
      expect(customer.getMerchantPointsBalance('merchant_123').toNumber()).toBe(50);
    });

    it('should reject the welcome bonus on a second call', () => {
      const customer = createCustomerWithEnrollment('merchant_123');

      customer.applyWelcomeBonus('merchant_123', Points.from(50), Points.from(50));

      expect(() => {
        customer.applyWelcomeBonus('merchant_123', Points.from(50), Points.from(50));
      }).toThrow('Welcome bonus has already been applied for this merchant');
    });

    it('should throw when applying bonus for a non-enrolled merchant', () => {
      const customer = createCustomerWithEnrollment('merchant_123');

      expect(() => {
        customer.applyWelcomeBonus('unknown_merchant', Points.from(50), Points.from(50));
      }).toThrow('Customer not enrolled with this merchant');
    });

    it('should not require consent to apply the welcome bonus', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone, 'Test Customer');
      customer.enrollWithMerchant('merchant_123');
      // Consent is still PENDING — bonus should still work

      customer.applyWelcomeBonus('merchant_123', Points.from(100), Points.from(100));

      expect(customer.getGlobalPointsBalance().toNumber()).toBe(100);
      expect(customer.getMerchantPointsBalance('merchant_123').toNumber()).toBe(100);
    });

    it('should update both balance and lifetime points', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      // Earn some points first so lifetime > 0
      customer.addPointsFromPurchase('merchant_123', Points.from(200), Points.from(150));

      customer.applyWelcomeBonus('merchant_123', Points.from(50), Points.from(25));

      expect(customer.getGlobalPointsBalance().toNumber()).toBe(250);
      expect(customer.getGlobalLifetimePoints().toNumber()).toBe(250);
    });

    it('should set welcomeBonusApplied to true in serialized enrollment', () => {
      const customer = createCustomerWithEnrollment('merchant_123');

      customer.applyWelcomeBonus('merchant_123', Points.from(50), Points.from(50));

      const json = customer.toJSON();
      const enrollment = json.enrollments.find((e) => e.merchantId === 'merchant_123');
      expect(enrollment?.welcomeBonusApplied).toBe(true);
    });

    it('should have welcomeBonusApplied false before applying the bonus', () => {
      const customer = createCustomerWithEnrollment('merchant_123');

      const json = customer.toJSON();
      const enrollment = json.enrollments.find((e) => e.merchantId === 'merchant_123');
      expect(enrollment?.welcomeBonusApplied).toBe(false);
    });

    it('should apply independent welcome bonuses per merchant', () => {
      const customer = createCustomerWithEnrollment('merchant_a');
      customer.enrollWithMerchant('merchant_b');
      customer.grantConsent('merchant_b');

      customer.applyWelcomeBonus('merchant_a', Points.from(50), Points.from(50));
      customer.applyWelcomeBonus('merchant_b', Points.from(100), Points.from(100));

      expect(customer.getGlobalPointsBalance().toNumber()).toBe(150);
      expect(customer.getMerchantPointsBalance('merchant_a').toNumber()).toBe(50);
      expect(customer.getMerchantPointsBalance('merchant_b').toNumber()).toBe(100);
    });
  });

  /**
   * ============================================
   * INTEGRATION SCENARIOS
   * ============================================
   */
  describe('Integration Scenarios', () => {
    describe('Full customer lifecycle', () => {
      it('should track a customer from signup to Diamond and back', () => {
        const customer = createCustomerWithEnrollment('store_a');
        customer.enrollWithMerchant('store_b');
        customer.grantConsent('store_b');

        // Week 1: New customer makes first purchase
        expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.BRONZE);
        customer.addPointsFromPurchase('store_a', Points.from(1000), Points.from(1000));
        expect(customer.getGlobalPointsBalance().toNumber()).toBe(1000);

        // Week 2-4: Heavy shopping, reaches Diamond
        customer.addPointsFromPurchase('store_a', Points.from(5000), Points.from(5000));
        expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.GOLD);

        customer.addPointsFromPurchase('store_b', Points.from(10000), Points.from(10000));
        expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.DIAMOND);

        // Diamond gets 1.2x earning bonus
        expect(customer.getEarningMultiplier()).toBe(1.2);
        expect(customer.isDecayImmune()).toBe(true);

        // Month 2: Customer is less active, doesn't maintain Diamond
        customer.resetMonthlyProgress();
        customer.addPointsFromPurchase('store_a', Points.from(3000), Points.from(3000));

        // End of month: Drops one level (Diamond → Platinum)
        customer.updateTierFromProgress();
        expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.PLATINUM);

        // Month 3: Even less active (Platinum → Gold)
        customer.resetMonthlyProgress();
        customer.addPointsFromPurchase('store_a', Points.from(1000), Points.from(1000));

        customer.updateTierFromProgress();
        expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.GOLD);

        // Customer redeems points using smart redemption
        setMerchantPointsBalance(customer, 'store_a', 500);
        const redemption = customer.redeemSmart('store_a', Points.from(800));

        expect(redemption.merchantPointsUsed.toNumber()).toBe(500);
        expect(redemption.globalPointsUsed.toNumber()).toBe(300);
      });
    });

    describe('Multi-merchant scenario', () => {
      it('should handle customer active at multiple stores', () => {
        const customer = createCustomerWithEnrollment('coffee_shop');
        customer.enrollWithMerchant('grocery_store');
        customer.grantConsent('grocery_store');
        customer.enrollWithMerchant('restaurant');
        customer.grantConsent('restaurant');

        // Shop at different merchants
        customer.addPointsFromPurchase('coffee_shop', Points.from(100), Points.from(100));
        customer.addPointsFromPurchase('grocery_store', Points.from(500), Points.from(500));
        customer.addPointsFromPurchase('restaurant', Points.from(300), Points.from(300));

        // Global points accumulate
        expect(customer.getGlobalPointsBalance().toNumber()).toBe(900);

        // Merchant points are separate
        expect(customer.getMerchantPointsBalance('coffee_shop').toNumber()).toBe(100);
        expect(customer.getMerchantPointsBalance('grocery_store').toNumber()).toBe(500);
        expect(customer.getMerchantPointsBalance('restaurant').toNumber()).toBe(300);

        // Redeem at grocery store - uses grocery merchant points first
        const result = customer.redeemSmart('grocery_store', Points.from(700));

        expect(result.merchantPointsUsed.toNumber()).toBe(500);
        expect(result.globalPointsUsed.toNumber()).toBe(200);

        // Other merchant balances unchanged
        expect(customer.getMerchantPointsBalance('coffee_shop').toNumber()).toBe(100);
        expect(customer.getMerchantPointsBalance('restaurant').toNumber()).toBe(300);
      });
    });
  });

  /**
   * ============================================
   * TIER UPGRADES VIA addPointsFromPurchase
   * ============================================
   */
  describe('Tier upgrades via addPointsFromPurchase', () => {
    it('Bronze → Gold: crossing 5000 threshold by 1 point upgrades tier', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setMonthlyProgress(customer, 4999);

      customer.addPointsFromPurchase('merchant_123', Points.from(1), Points.from(1));

      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.GOLD);
    });

    it('Bronze → Gold: large single purchase that crosses 5000 threshold', () => {
      const customer = createCustomerWithEnrollment('merchant_123');

      customer.addPointsFromPurchase('merchant_123', Points.from(6000), Points.from(6000));

      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.GOLD);
    });

    it('Gold → Platinum: crossing 10000 threshold by 1 point upgrades tier', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setCustomerTier(customer, CustomerTier.gold());
      setMonthlyProgress(customer, 9999);

      customer.addPointsFromPurchase('merchant_123', Points.from(1), Points.from(1), {
        skipTierBoost: true,
      });

      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.PLATINUM);
    });

    it('Platinum → Diamond: crossing 15000 threshold by 1 point upgrades tier', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setCustomerTier(customer, CustomerTier.platinum());
      setMonthlyProgress(customer, 14999);

      customer.addPointsFromPurchase('merchant_123', Points.from(1), Points.from(1), {
        skipTierBoost: true,
      });

      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.DIAMOND);
    });

    it('tierLastUpdatedAt is updated when tier upgrades', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      const before = customer.getTierLastUpdatedAt();
      setMonthlyProgress(customer, 4999);

      customer.addPointsFromPurchase('merchant_123', Points.from(1), Points.from(1));

      const after = customer.getTierLastUpdatedAt();
      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.GOLD);
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('tierLastUpdatedAt is NOT updated when tier remains the same', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      const originalDate = new Date('2025-01-01T00:00:00.000Z');
      const props = (customer as unknown as CustomerWithProps).props;
      props.tierLastUpdatedAt = originalDate;

      customer.addPointsFromPurchase('merchant_123', Points.from(100), Points.from(100));

      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(customer.getTierLastUpdatedAt()).toBe(originalDate);
    });

    it('Gold multiplier (1.1x): 100 base points → 110 global points', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setCustomerTier(customer, CustomerTier.gold());

      const { boostedGlobalPoints } = customer.addPointsFromPurchase(
        'merchant_123',
        Points.from(100),
        Points.from(100),
      );

      expect(boostedGlobalPoints.toNumber()).toBe(110);
    });

    it('Platinum multiplier (1.15x): 100 base points → 115 global points', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setCustomerTier(customer, CustomerTier.platinum());

      const { boostedGlobalPoints } = customer.addPointsFromPurchase(
        'merchant_123',
        Points.from(100),
        Points.from(100),
      );

      expect(boostedGlobalPoints.toNumber()).toBe(115);
    });

    it('Diamond multiplier (1.2x): 100 base points → 120 global points', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setCustomerTier(customer, CustomerTier.diamond());

      const { boostedGlobalPoints } = customer.addPointsFromPurchase(
        'merchant_123',
        Points.from(100),
        Points.from(100),
      );

      expect(boostedGlobalPoints.toNumber()).toBe(120);
    });

    it('Multiplier rounds down (floor): Platinum 7 base points → 8 global points', () => {
      const customer = createCustomerWithEnrollment('merchant_123');
      setCustomerTier(customer, CustomerTier.platinum());

      const { boostedGlobalPoints } = customer.addPointsFromPurchase(
        'merchant_123',
        Points.from(7),
        Points.from(7),
      );

      // Math.floor(7 * 1.15) = Math.floor(8.05) = 8
      expect(boostedGlobalPoints.toNumber()).toBe(8);
    });
  });
});
