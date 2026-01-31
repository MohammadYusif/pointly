import { describe, expect, it } from 'vitest';
import {
  Customer,
  CustomerTierLevel,
  Email,
  Merchant,
  MerchantTier,
  Money,
  PhoneNumber,
  Points,
  Transaction,
  TransactionType,
} from '../index';

describe('Domain Entities', () => {
  describe('Value Objects', () => {
    it('should create a valid Saudi phone number', () => {
      const phone = new PhoneNumber('0501234567');
      expect(phone.toString()).toBe('966501234567');
      expect(phone.toE164()).toBe('+966501234567');
      expect(phone.toLocal()).toBe('0501234567');
    });

    it('should create a valid email', () => {
      const email = new Email('test@example.com');
      expect(email.toString()).toBe('test@example.com');
      expect(email.getDomain()).toBe('example.com');
    });

    it('should handle money calculations correctly', () => {
      const money1 = Money.fromSAR(100);
      const money2 = Money.fromSAR(50);
      const sum = money1.add(money2);

      expect(sum.toSAR()).toBe(150);
      expect(sum.toString()).toBe('150.00 SAR');
    });

    it('should handle points calculations correctly', () => {
      const points1 = Points.from(100);
      const points2 = Points.from(50);
      const sum = points1.add(points2);

      expect(sum.toNumber()).toBe(150);
    });
  });

  describe('Customer Entity', () => {
    it('should create a new customer with zero global points', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone, 'Ahmed Al-Saud');

      expect(customer.getPhone()).toBe(phone);
      expect(customer.getName()).toBe('Ahmed Al-Saud');
      expect(customer.getCustomerId()).toBeTruthy();
      expect(customer.getGlobalPointsBalance().toNumber()).toBe(0);
      expect(customer.getGlobalLifetimePoints().toNumber()).toBe(0);
    });

    it('should enroll customer with merchant', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      const enrollment = customer.getEnrollment(merchantId);

      expect(enrollment).toBeTruthy();
      expect(enrollment?.merchantId).toBe(merchantId);
      expect(enrollment?.merchantPointsBalance.toNumber()).toBe(0);
    });

    it('should add dual points from purchase', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);
      customer.addPointsFromPurchase(
        merchantId,
        Points.from(150), // global points (1.5x)
        Points.from(100), // merchant points (1x)
      );

      expect(customer.getGlobalPointsBalance().toNumber()).toBe(150);
      expect(customer.getMerchantPointsBalance(merchantId).toNumber()).toBe(100);
    });

    it('should redeem global points', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);
      customer.addPointsFromPurchase(merchantId, Points.from(200), Points.from(100));

      customer.redeemGlobalPoints(Points.from(50));

      expect(customer.getGlobalPointsBalance().toNumber()).toBe(150);
      expect(customer.getGlobalLifetimePoints().toNumber()).toBe(200);
    });

    it('should redeem merchant points', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);
      customer.addPointsFromPurchase(merchantId, Points.from(150), Points.from(100));

      customer.redeemMerchantPoints(merchantId, Points.from(30));

      expect(customer.getMerchantPointsBalance(merchantId).toNumber()).toBe(70);
    });
  });

  describe('Merchant Entity', () => {
    it('should create a new merchant with default location', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      expect(merchant.getBusinessName()).toBe('Test Store');
      expect(merchant.getTier()).toBe(MerchantTier.BASIC);
      expect(merchant.getMerchantId()).toBeTruthy();
      expect(merchant.getLocations()).toHaveLength(1);
      expect(merchant.getMaxLocations()).toBe(1);
    });

    it('should calculate dual points for purchase', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      merchant.verify();

      const points = merchant.calculatePointsForPurchase(100);
      expect(points.merchantPoints).toBe(100);
      expect(points.globalPoints).toBe(100); // 1x for BASIC
    });

    it('should calculate same global points for PROFESSIONAL tier (simplified)', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create(
        'Test Store',
        email,
        phone,
        'Ahmed',
        MerchantTier.PROFESSIONAL,
      );

      merchant.verify();

      const points = merchant.calculatePointsForPurchase(100);
      expect(points.merchantPoints).toBe(100);
      expect(points.globalPoints).toBe(100); // Simplified: 1:1 for all tiers
    });

    it('should calculate same global points for ENTERPRISE tier (simplified)', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create(
        'Test Store',
        email,
        phone,
        'Ahmed',
        MerchantTier.ENTERPRISE,
      );

      merchant.verify();

      const points = merchant.calculatePointsForPurchase(100);
      expect(points.merchantPoints).toBe(100);
      expect(points.globalPoints).toBe(100); // Simplified: 1:1 for all tiers
    });

    it('should upgrade tier and update maxLocations', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      expect(merchant.getMaxLocations()).toBe(1);

      merchant.upgradeTier(MerchantTier.PROFESSIONAL);
      expect(merchant.getTier()).toBe(MerchantTier.PROFESSIONAL);
      expect(merchant.getMaxLocations()).toBe(3);
    });

    it('should allow adding locations for PROFESSIONAL tier', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create(
        'Test Store',
        email,
        phone,
        'Ahmed',
        MerchantTier.PROFESSIONAL,
      );

      const newLocation = merchant.addLocation('Branch 2', '123 Main St', 'Riyadh');

      expect(newLocation.name).toBe('Branch 2');
      expect(merchant.getLocations()).toHaveLength(2);
    });

    it('should not allow adding locations for BASIC tier', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      expect(() => {
        merchant.addLocation('Branch 2', '123 Main St', 'Riyadh');
      }).toThrow('Multi-location is not enabled for this tier');
    });

    it('should deactivate location', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create(
        'Test Store',
        email,
        phone,
        'Ahmed',
        MerchantTier.PROFESSIONAL,
      );

      const newLocation = merchant.addLocation('Branch 2', '123 Main St', 'Riyadh');
      merchant.deactivateLocation(newLocation.locationId);

      expect(merchant.getActiveLocations()).toHaveLength(1);
      expect(merchant.getLocations()).toHaveLength(2);
    });
  });

  describe('Transaction Entity', () => {
    it('should create an earn transaction', () => {
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        'idempotency_123',
      );

      expect(transaction.getType()).toBe(TransactionType.EARN);
      expect(transaction.getPoints().toNumber()).toBe(100);
      expect(transaction.getBalanceBefore().toNumber()).toBe(500);
      expect(transaction.getBalanceAfter().toNumber()).toBe(600);
    });

    it('should create a redeem transaction', () => {
      const transaction = Transaction.createRedeem(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(1),
        Points.from(500),
        'idempotency_123',
      );

      expect(transaction.getType()).toBe(TransactionType.REDEEM);
      expect(transaction.getPoints().toNumber()).toBe(100);
      expect(transaction.getBalanceAfter().toNumber()).toBe(400);
    });

    it('should complete a transaction', () => {
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        'idempotency_123',
      );

      transaction.complete();
      expect(transaction.getCompletedAt()).toBeTruthy();
    });

    it('should create an expiration transaction for decayed points', () => {
      const transaction = Transaction.createExpiration(
        'SYSTEM',
        'customer_123',
        Points.from(50),
        Points.from(500),
        'expiration_key_123',
        { reason: '3_months_inactivity' },
      );

      expect(transaction.getType()).toBe(TransactionType.EXPIRATION);
      expect(transaction.getStatus()).toBe('COMPLETED');
      expect(transaction.getPoints().toNumber()).toBe(50);
      expect(transaction.getBalanceBefore().toNumber()).toBe(500);
      expect(transaction.getBalanceAfter().toNumber()).toBe(450);
    });
  });

  describe('Customer Decay System', () => {
    it('should track last network activity', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);

      expect(customer.getLastNetworkActivity()).toBeInstanceOf(Date);
    });

    it('should be in active phase with recent activity', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);

      expect(customer.getGlobalPointsDecayPhase()).toBe(0);
      expect(customer.getMonthsOfInactivity()).toBe(0);
    });

    it('should calculate zero decay for active customers', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);
      customer.addPointsFromPurchase(merchantId, Points.from(1000), Points.from(1000));

      const decayAmount = customer.calculateDecayAmount();
      expect(decayAmount.toNumber()).toBe(0);
    });

    it('should reset decay timer on purchase', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);

      // Make a purchase
      customer.addPointsFromPurchase(merchantId, Points.from(10), Points.from(10));

      expect(customer.getGlobalPointsDecayPhase()).toBe(0);
      expect(customer.getDecayStartDate()).toBeUndefined();
    });

    it('should include decay info in toJSON()', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);

      const json = customer.toJSON();

      expect(json.lastNetworkActivity).toBeDefined();
      expect(json.globalPointsDecayPhase).toBe(0);
      expect(json.monthsOfInactivity).toBe(0);
    });
  });
});
describe('Customer Tier System', () => {
  it('should start at Bronze tier', () => {
    const phone = new PhoneNumber('0501234567');
    const customer = Customer.create(phone);

    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.BRONZE);
    expect(customer.getMonthlyProgress().toNumber()).toBe(0);
  });

  it('should upgrade to Platinum after earning 5,000 points', () => {
    const phone = new PhoneNumber('0501234567');
    const customer = Customer.create(phone);
    const merchantId = 'merchant_123';

    customer.enrollWithMerchant(merchantId);
    customer.grantConsent(merchantId);

    // Earn 5,000 points in one purchase
    customer.addPointsFromPurchase(merchantId, Points.from(5000), Points.from(5000));

    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.PLATINUM);
    expect(customer.getMonthlyProgress().toNumber()).toBe(5000);
  });

  it('should upgrade to Diamond after earning 15,000 points', () => {
    const phone = new PhoneNumber('0501234567');
    const customer = Customer.create(phone);
    const merchantId = 'merchant_123';

    customer.enrollWithMerchant(merchantId);
    customer.grantConsent(merchantId);

    // Earn 15,000 points
    customer.addPointsFromPurchase(merchantId, Points.from(15000), Points.from(15000));

    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.DIAMOND);
    expect(customer.getMonthlyProgress().toNumber()).toBe(15000);
  });

  it('should NOT downgrade tier when redeeming points', () => {
    const phone = new PhoneNumber('0501234567');
    const customer = Customer.create(phone);
    const merchantId = 'merchant_123';

    customer.enrollWithMerchant(merchantId);
    customer.grantConsent(merchantId);

    // Earn 10,000 points → Platinum
    customer.addPointsFromPurchase(merchantId, Points.from(10000), Points.from(10000));

    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.PLATINUM);

    // Redeem 9,000 points
    customer.redeemGlobalPoints(Points.from(9000));

    // Tier should stay Platinum
    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.PLATINUM);
    expect(customer.getGlobalPointsBalance().toNumber()).toBe(1000);
    expect(customer.getMonthlyProgress().toNumber()).toBe(10000); // Monthly progress unchanged
  });

  it('should calculate points to next tier correctly', () => {
    const phone = new PhoneNumber('0501234567');
    const customer = Customer.create(phone);
    const merchantId = 'merchant_123';

    customer.enrollWithMerchant(merchantId);
    customer.grantConsent(merchantId);

    // Bronze with 0 points
    expect(customer.getPointsToNextTier()).toBe(5000);

    // Earn 3,000 points (still Bronze)
    customer.addPointsFromPurchase(merchantId, Points.from(3000), Points.from(3000));
    expect(customer.getPointsToNextTier()).toBe(2000); // 5000 - 3000

    // Earn 3,000 more (now Platinum with 6,000 total)
    customer.addPointsFromPurchase(merchantId, Points.from(3000), Points.from(3000));
    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.PLATINUM);
    expect(customer.getPointsToNextTier()).toBe(9000); // 15000 - 6000

    // Earn 10,000 more (now Diamond with 16,000 total)
    customer.addPointsFromPurchase(merchantId, Points.from(10000), Points.from(10000));
    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.DIAMOND);
    expect(customer.getPointsToNextTier()).toBe(0); // At top tier
  });

  it('should reset monthly progress', () => {
    const phone = new PhoneNumber('0501234567');
    const customer = Customer.create(phone);
    const merchantId = 'merchant_123';

    customer.enrollWithMerchant(merchantId);
    customer.grantConsent(merchantId);

    customer.addPointsFromPurchase(merchantId, Points.from(10000), Points.from(10000));

    expect(customer.getMonthlyProgress().toNumber()).toBe(10000);

    customer.resetMonthlyProgress();

    expect(customer.getMonthlyProgress().toNumber()).toBe(0);
  });

  it('should update tier based on monthly progress', () => {
    const phone = new PhoneNumber('0501234567');
    const customer = Customer.create(phone);
    const merchantId = 'merchant_123';

    customer.enrollWithMerchant(merchantId);
    customer.grantConsent(merchantId);

    // Earn 10,000 points → Platinum
    customer.addPointsFromPurchase(merchantId, Points.from(10000), Points.from(10000));

    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.PLATINUM);

    // Simulate month end: reset progress
    customer.resetMonthlyProgress();

    // New month: earn only 2,000 points (below Platinum threshold)
    customer.addPointsFromPurchase(merchantId, Points.from(2000), Points.from(2000));

    // Update tier based on new monthly progress
    const newTier = customer.updateTierFromProgress();

    // Should drop back to Bronze
    expect(newTier.getLevel()).toBe(CustomerTierLevel.BRONZE);
    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.BRONZE);
  });

  it('should have correct redemption multiplier per tier', () => {
    const phone = new PhoneNumber('0501234567');
    const customer = Customer.create(phone);

    // Bronze: 1.0x
    expect(customer.getRedemptionMultiplier()).toBe(1.0);

    const merchantId = 'merchant_123';
    customer.enrollWithMerchant(merchantId);
    customer.grantConsent(merchantId);

    // Earn to Platinum
    customer.addPointsFromPurchase(merchantId, Points.from(5000), Points.from(5000));
    expect(customer.getRedemptionMultiplier()).toBe(1.2);

    // Earn to Diamond
    customer.addPointsFromPurchase(merchantId, Points.from(10000), Points.from(10000));
    expect(customer.getRedemptionMultiplier()).toBe(1.5);
  });
});
