import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  ConsentStatus,
  Customer,
  CustomerStatus,
  CustomerTierLevel,
  DomainError,
  Email,
  ForbiddenError,
  InsufficientPointsError,
  Merchant,
  MerchantStatus,
  MerchantTier,
  Money,
  NotFoundError,
  PhoneNumber,
  Points,
  Transaction,
  TransactionStatus,
  TransactionType,
  UnauthorizedError,
  ValidationError,
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

    describe('PhoneNumber Edge Cases', () => {
      it('should handle E164 format by stripping + and normalizing', () => {
        const phone = new PhoneNumber('+966501234567');
        expect(phone.toString()).toBe('966501234567');
      });

      it('should format for display correctly', () => {
        const phone = new PhoneNumber('0501234567');
        expect(phone.toDisplay()).toBe('+966 50 123 4567');
      });

      it('should create from local format via fromLocal', () => {
        const phone = PhoneNumber.fromLocal('0501234567');
        expect(phone.toString()).toBe('966501234567');
        expect(phone.toLocal()).toBe('0501234567');
      });

      it('should create from E164 format via fromE164', () => {
        const phone = PhoneNumber.fromE164('+966501234567');
        expect(phone.toString()).toBe('966501234567');
        expect(phone.toE164()).toBe('+966501234567');
      });

      it('should consider two phones with same number as equal', () => {
        const phone1 = new PhoneNumber('0501234567');
        const phone2 = new PhoneNumber('0501234567');
        expect(phone1.equals(phone2)).toBe(true);
      });

      it('should consider two phones with different numbers as not equal', () => {
        const phone1 = new PhoneNumber('0501234567');
        const phone2 = new PhoneNumber('0509876543');
        expect(phone1.equals(phone2)).toBe(false);
      });

      it('should reject invalid prefix (4XX)', () => {
        expect(() => new PhoneNumber('0401234567')).toThrow('Invalid mobile number prefix');
      });

      it('should reject wrong country code', () => {
        expect(() => new PhoneNumber('971501234567')).toThrow();
      });

      it('should reject too short number', () => {
        expect(() => new PhoneNumber('050123456')).toThrow();
      });

      it('should reject too long number', () => {
        expect(() => new PhoneNumber('05012345678')).toThrow();
      });

      it('should reject empty string', () => {
        expect(() => new PhoneNumber('')).toThrow();
      });

      it('should strip dashes and spaces and normalize', () => {
        const phone = new PhoneNumber('050-123-4567');
        expect(phone.toString()).toBe('966501234567');
        expect(phone.toLocal()).toBe('0501234567');
      });
    });

    describe('Email Edge Cases', () => {
      it('should normalize case to lowercase', () => {
        const email = new Email('TEST@EXAMPLE.COM');
        expect(email.toString()).toBe('test@example.com');
      });

      it('should trim whitespace', () => {
        const email = new Email('  test@example.com  ');
        expect(email.toString()).toBe('test@example.com');
      });

      it('should return local part via getLocalPart', () => {
        const email = new Email('test@example.com');
        expect(email.getLocalPart()).toBe('test');
      });

      it('should consider two emails with same value as equal', () => {
        const email1 = new Email('test@example.com');
        const email2 = new Email('test@example.com');
        expect(email1.equals(email2)).toBe(true);
      });

      it('should consider two emails with different values as not equal', () => {
        const email1 = new Email('test@example.com');
        const email2 = new Email('other@example.com');
        expect(email1.equals(email2)).toBe(false);
      });

      it('should accept plus addressing', () => {
        const email = new Email('test+tag@example.com');
        expect(email.toString()).toBe('test+tag@example.com');
        expect(email.getLocalPart()).toBe('test+tag');
      });

      it('should reject missing @', () => {
        expect(() => new Email('testexample.com')).toThrow();
      });

      it('should reject missing domain', () => {
        expect(() => new Email('test@')).toThrow();
      });

      it('should reject spaces in email', () => {
        expect(() => new Email('test test@example.com')).toThrow();
      });

      it('should reject email longer than 254 characters', () => {
        const longLocal = 'a'.repeat(64);
        const longDomain = `${'b'.repeat(186)}.com`; // 64 + 1(@) + 190 = 255
        const longEmail = `${longLocal}@${longDomain}`;
        expect(longEmail.length).toBe(255);
        expect(() => new Email(longEmail)).toThrow('Email too long');
      });

      it('should reject local part longer than 64 characters', () => {
        const longLocal = 'a'.repeat(65);
        const email = `${longLocal}@example.com`;
        expect(() => new Email(email)).toThrow();
      });
    });

    describe('Money Extended', () => {
      it('should create zero money via Money.zero()', () => {
        const zero = Money.zero();
        expect(zero.toSAR()).toBe(0);
        expect(zero.getCurrency()).toBe('SAR');
      });

      it('should create money from halalas', () => {
        const money = Money.fromHalalas(150);
        expect(money.toSAR()).toBe(1.5);
      });

      it('should round SAR to nearest halala', () => {
        // fromSAR stores internally as halalas via Math.round(amount * 100)
        // 1.006 * 100 = 100.6 → Math.round → 101 halalas → 1.01 SAR
        const money = Money.fromSAR(1.006);
        expect(money.toSAR()).toBe(1.01);
      });

      it('should subtract itself to get zero', () => {
        const money = Money.fromSAR(50);
        const result = money.subtract(money);
        expect(result.isZero()).toBe(true);
      });

      it('should throw when subtract would go negative', () => {
        const money1 = Money.fromSAR(10);
        const money2 = Money.fromSAR(20);
        expect(() => money1.subtract(money2)).toThrow();
      });

      it('should multiply by 0 to get zero', () => {
        const money = Money.fromSAR(100);
        const result = money.multiply(0);
        expect(result.isZero()).toBe(true);
      });

      it('should throw when multiplying by negative', () => {
        const money = Money.fromSAR(100);
        expect(() => money.multiply(-1)).toThrow();
      });

      it('should throw when dividing by zero', () => {
        const money = Money.fromSAR(100);
        expect(() => money.divide(0)).toThrow();
      });

      it('should compare with isGreaterThan', () => {
        const big = Money.fromSAR(100);
        const small = Money.fromSAR(50);
        expect(big.isGreaterThan(small)).toBe(true);
        expect(small.isGreaterThan(big)).toBe(false);
      });

      it('should compare with isLessThan', () => {
        const big = Money.fromSAR(100);
        const small = Money.fromSAR(50);
        expect(small.isLessThan(big)).toBe(true);
        expect(big.isLessThan(small)).toBe(false);
      });

      it('should compare with equals', () => {
        const money1 = Money.fromSAR(100);
        const money2 = Money.fromSAR(100);
        expect(money1.equals(money2)).toBe(true);
      });

      it('should check isZero correctly', () => {
        expect(Money.zero().isZero()).toBe(true);
        expect(Money.fromSAR(1).isZero()).toBe(false);
      });

      it('should return currency as SAR', () => {
        const money = Money.fromSAR(1);
        expect(money.getCurrency()).toBe('SAR');
      });

      it('should serialize to JSON with amount and currency', () => {
        const money = Money.fromSAR(10.5);
        const json = money.toJSON();
        expect(json).toEqual({ amount: 10.5, currency: 'SAR' });
      });

      it('should convert to halalas correctly', () => {
        const money = Money.fromSAR(1.5);
        expect(money.toHalalas()).toBe(150);
      });
    });

    describe('Points Extended', () => {
      it('should create zero points via Points.zero()', () => {
        const zero = Points.zero();
        expect(zero.toNumber()).toBe(0);
      });

      it('should subtract itself to get zero', () => {
        const points = Points.from(100);
        const result = points.subtract(points);
        expect(result.isZero()).toBe(true);
      });

      it('should throw when subtract would go negative', () => {
        const points1 = Points.from(10);
        const points2 = Points.from(20);
        expect(() => points1.subtract(points2)).toThrow();
      });

      it('should multiply by 0 to get zero', () => {
        const points = Points.from(100);
        const result = points.multiply(0);
        expect(result.isZero()).toBe(true);
      });

      it('should throw when multiplying by negative factor', () => {
        const points = Points.from(100);
        expect(() => points.multiply(-1)).toThrow();
      });

      it('should multiply with floor: 100 * 0.33 = 33', () => {
        const points = Points.from(100);
        const result = points.multiply(0.33);
        expect(result.toNumber()).toBe(33);
      });

      it('should throw when dividing by zero', () => {
        const points = Points.from(100);
        expect(() => points.divide(0)).toThrow();
      });

      it('should divide with floor: 100 / 3 = 33', () => {
        const points = Points.from(100);
        const result = points.divide(3);
        expect(result.toNumber()).toBe(33);
      });

      it('should compare with isGreaterThan', () => {
        expect(Points.from(100).isGreaterThan(Points.from(50))).toBe(true);
        expect(Points.from(50).isGreaterThan(Points.from(100))).toBe(false);
      });

      it('should compare with isGreaterThanOrEqual', () => {
        expect(Points.from(100).isGreaterThanOrEqual(Points.from(100))).toBe(true);
        expect(Points.from(100).isGreaterThanOrEqual(Points.from(50))).toBe(true);
        expect(Points.from(50).isGreaterThanOrEqual(Points.from(100))).toBe(false);
      });

      it('should compare with isLessThan', () => {
        expect(Points.from(50).isLessThan(Points.from(100))).toBe(true);
        expect(Points.from(100).isLessThan(Points.from(50))).toBe(false);
      });

      it('should compare with isLessThanOrEqual', () => {
        expect(Points.from(100).isLessThanOrEqual(Points.from(100))).toBe(true);
        expect(Points.from(50).isLessThanOrEqual(Points.from(100))).toBe(true);
        expect(Points.from(100).isLessThanOrEqual(Points.from(50))).toBe(false);
      });

      it('should compare with equals', () => {
        expect(Points.from(100).equals(Points.from(100))).toBe(true);
        expect(Points.from(100).equals(Points.from(50))).toBe(false);
      });

      it('should check isZero correctly', () => {
        expect(Points.zero().isZero()).toBe(true);
        expect(Points.from(1).isZero()).toBe(false);
      });

      it('should reject NaN', () => {
        expect(() => Points.from(Number.NaN)).toThrow();
      });

      it('should convert to string', () => {
        expect(Points.from(42).toString()).toBe('42');
      });

      it('should convert to JSON as number', () => {
        expect(Points.from(42).toJSON()).toBe(42);
      });
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

  describe('Customer Extended', () => {
    it('should revoke consent and set status to REVOKED', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);
      customer.revokeConsent(merchantId);

      const enrollment = customer.getEnrollment(merchantId);
      expect(enrollment?.consentStatus).toBe(ConsentStatus.REVOKED);
    });

    it('should throw when revoking consent for non-enrolled merchant', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);

      expect(() => customer.revokeConsent('unknown_merchant')).toThrow();
    });

    it('should grant consent from REVOKED state (re-grant)', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);
      customer.revokeConsent(merchantId);
      customer.grantConsent(merchantId);

      const enrollment = customer.getEnrollment(merchantId);
      expect(enrollment?.consentStatus).toBe(ConsentStatus.GRANTED);
    });

    it('should be idempotent when granting consent that is already GRANTED', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      // Consent is auto-granted on enrollment; calling again should be a no-op
      expect(() => customer.grantConsent(merchantId)).not.toThrow();
    });

    it('should throw when enrolling with merchant already enrolled', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      expect(() => customer.enrollWithMerchant(merchantId)).toThrow('Customer already enrolled');
    });

    it('should throw when enrolling with merchant if customer is not ACTIVE', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);

      customer.suspend();
      expect(() => customer.enrollWithMerchant('merchant_123')).toThrow('Customer must be active');
    });

    it('should change status through suspend/activate/deactivate', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);

      expect(customer.getStatus()).toBe(CustomerStatus.ACTIVE);

      customer.suspend();
      expect(customer.getStatus()).toBe(CustomerStatus.SUSPENDED);

      customer.activate();
      expect(customer.getStatus()).toBe(CustomerStatus.ACTIVE);

      customer.deactivate();
      expect(customer.getStatus()).toBe(CustomerStatus.INACTIVE);
    });

    it('should redeem exact global points balance to zero', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);
      customer.addPointsFromPurchase(merchantId, Points.from(100), Points.from(100));

      customer.redeemGlobalPoints(Points.from(100));
      expect(customer.getGlobalPointsBalance().toNumber()).toBe(0);
    });

    it('should throw when redeeming more global points than available', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);
      customer.addPointsFromPurchase(merchantId, Points.from(100), Points.from(100));

      expect(() => customer.redeemGlobalPoints(Points.from(200))).toThrow();
    });

    it('should throw when redeeming merchant points with zero balance', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);

      expect(() => customer.redeemMerchantPoints(merchantId, Points.from(10))).toThrow(
        'Insufficient merchant points balance',
      );
    });

    it('should update name correctly', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone, 'Old Name');

      customer.updateName('New Name');
      expect(customer.getName()).toBe('New Name');
    });

    it('should calculate getPointsToNextTier correctly at each tier level', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone);
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);

      // Bronze with 0 progress
      expect(customer.getPointsToNextTier()).toBe(5000);

      // Earn to Gold
      customer.addPointsFromPurchase(merchantId, Points.from(5000), Points.from(5000));
      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.GOLD);
      expect(customer.getPointsToNextTier()).toBe(5000); // 10000 (Platinum) - 5000

      // Earn to Diamond
      customer.addPointsFromPurchase(merchantId, Points.from(10000), Points.from(10000));
      expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.DIAMOND);
      expect(customer.getPointsToNextTier()).toBe(0);
    });

    it('should include all fields in toJSON including enrollments array', () => {
      const phone = new PhoneNumber('0501234567');
      const customer = Customer.create(phone, 'Test User');
      const merchantId = 'merchant_123';

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);

      const json = customer.toJSON();

      expect(json.customerId).toBeTruthy();
      expect(json.phone).toBe('966501234567');
      expect(json.name).toBe('Test User');
      expect(json.status).toBe(CustomerStatus.ACTIVE);
      expect(json.globalPointsBalance).toBe(0);
      expect(json.globalLifetimePoints).toBe(0);
      expect(json.currentTier).toBe(CustomerTierLevel.BRONZE);
      expect(json.monthlyProgress).toBe(0);
      expect(json.earningMultiplier).toBe(1.0);
      expect(json.isDecayImmune).toBe(false);
      expect(json.enrollments).toBeInstanceOf(Array);
      expect(json.enrollments).toHaveLength(1);
      expect(json.enrollments[0].merchantId).toBe(merchantId);
      expect(json.createdAt).toBeTruthy();
      expect(json.updatedAt).toBeTruthy();
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

  describe('Merchant Extended', () => {
    it('should change status to ACTIVE and set verifiedAt on verify()', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      expect(merchant.getStatus()).toBe(MerchantStatus.PENDING_VERIFICATION);
      expect(merchant.getVerifiedAt()).toBeUndefined();

      merchant.verify();

      expect(merchant.getStatus()).toBe(MerchantStatus.ACTIVE);
      expect(merchant.getVerifiedAt()).toBeInstanceOf(Date);
    });

    it('should throw when verifying an already ACTIVE merchant', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      merchant.verify();
      expect(() => merchant.verify()).toThrow('Merchant already verified');
    });

    it('should change status through suspend and activate', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      merchant.verify();
      expect(merchant.getStatus()).toBe(MerchantStatus.ACTIVE);

      merchant.suspend();
      expect(merchant.getStatus()).toBe(MerchantStatus.SUSPENDED);

      merchant.activate();
      expect(merchant.getStatus()).toBe(MerchantStatus.ACTIVE);
    });

    it('should allow partial update via updateBusinessInfo', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      merchant.updateBusinessInfo({ businessName: 'New Store Name' });
      expect(merchant.getBusinessName()).toBe('New Store Name');
      expect(merchant.getContactName()).toBe('Ahmed');
    });

    it('should allow partial update via updateLoyaltyConfig', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      const originalConfig = merchant.getLoyaltyConfig();
      merchant.updateLoyaltyConfig({ minimumPurchase: 20 });

      const updatedConfig = merchant.getLoyaltyConfig();
      expect(updatedConfig.minimumPurchase).toBe(20);
      expect(updatedConfig.pointsPerSAR).toBe(originalConfig.pointsPerSAR);
    });

    it('should prevent enabling multi-location on BASIC tier via updateLoyaltyConfig', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      expect(() => merchant.updateLoyaltyConfig({ enableMultiLocation: true })).toThrow(
        'Multi-location is not available for BASIC tier',
      );
    });

    it('should throw on downgrade via upgradeTier', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create(
        'Test Store',
        email,
        phone,
        'Ahmed',
        MerchantTier.PROFESSIONAL,
      );

      expect(() => merchant.upgradeTier(MerchantTier.BASIC)).toThrow(
        'Can only upgrade to a higher tier',
      );
    });

    it('should earn points for any positive purchase amount with ENTERPRISE tier (min=0)', () => {
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

      // Enterprise has minimumPurchase=0, so even 1 SAR should earn
      const points = merchant.calculatePointsForPurchase(1);
      expect(points.merchantPoints).toBe(1);
      expect(points.globalPoints).toBe(1);
    });

    it('should decrement SMS quota via useSMS', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      merchant.useSMS();
      expect(merchant.getSMSQuota().currentUsage).toBe(1);

      merchant.useSMS(5);
      expect(merchant.getSMSQuota().currentUsage).toBe(6);
    });

    it('should throw when SMS quota is exceeded', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      // BASIC tier has 100 SMS quota
      merchant.useSMS(100);
      expect(() => merchant.useSMS(1)).toThrow('SMS quota exceeded');
    });

    it('should reset SMS quota to zero usage via resetSMSQuota', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      merchant.useSMS(50);
      expect(merchant.getSMSQuota().currentUsage).toBe(50);

      merchant.resetSMSQuota();
      expect(merchant.getSMSQuota().currentUsage).toBe(0);
    });

    it('should increment customer count', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      merchant.incrementCustomerCount();
      const json = merchant.toJSON();
      expect(json.totalCustomers).toBe(1);
      expect(json.activeCustomers).toBe(1);
    });

    it('should increment transaction count', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      merchant.incrementTransactionCount();
      merchant.incrementTransactionCount();
      const json = merchant.toJSON();
      expect(json.totalTransactions).toBe(2);
    });

    it('should include all fields in toJSON', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      const json = merchant.toJSON();

      expect(json.merchantId).toBeTruthy();
      expect(json.businessName).toBe('Test Store');
      expect(json.email).toBe('test@example.com');
      expect(json.phone).toBe('966501234567');
      expect(json.contactName).toBe('Ahmed');
      expect(json.tier).toBe(MerchantTier.BASIC);
      expect(json.status).toBe(MerchantStatus.PENDING_VERIFICATION);
      expect(json.loyaltyConfig).toBeDefined();
      expect(json.smsQuota).toBeDefined();
      expect(json.locations).toBeInstanceOf(Array);
      expect(json.maxLocations).toBe(1);
      expect(json.totalCustomers).toBe(0);
      expect(json.activeCustomers).toBe(0);
      expect(json.totalTransactions).toBe(0);
      expect(json.createdAt).toBeTruthy();
      expect(json.updatedAt).toBeTruthy();
      expect(json.verifiedAt).toBeUndefined();
    });

    it('should set and get walletConfig', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      expect(merchant.getWalletConfig()).toBeUndefined();

      merchant.setWalletConfig({ primaryColor: '#0d9488', backgroundColor: '#ffffff' });
      const config = merchant.getWalletConfig();

      expect(config?.primaryColor).toBe('#0d9488');
      expect(config?.backgroundColor).toBe('#ffffff');
      expect(config?.logoUrl).toBeUndefined();
    });

    it('should include walletConfig in toJSON when set', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      merchant.setWalletConfig({
        primaryColor: '#0d9488',
        backgroundColor: '#ffffff',
        logoUrl: 'https://cdn.example.com/logo.png',
      });

      const json = merchant.toJSON();
      expect(json.walletConfig).toEqual({
        primaryColor: '#0d9488',
        backgroundColor: '#ffffff',
        logoUrl: 'https://cdn.example.com/logo.png',
      });
    });

    it('should omit walletConfig from toJSON when not set', () => {
      const email = new Email('test@example.com');
      const phone = new PhoneNumber('0501234567');
      const merchant = Merchant.create('Test Store', email, phone, 'Ahmed', MerchantTier.BASIC);

      const json = merchant.toJSON();
      expect(json.walletConfig).toBeUndefined();
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

  describe('Transaction Extended', () => {
    it('should create a positive adjustment that adds points', () => {
      const transaction = Transaction.createAdjustment(
        'merchant_123',
        'customer_123',
        Points.from(50),
        Points.from(200),
        true,
        'adj_key_1',
      );

      expect(transaction.getType()).toBe(TransactionType.ADJUSTMENT);
      expect(transaction.getBalanceBefore().toNumber()).toBe(200);
      expect(transaction.getBalanceAfter().toNumber()).toBe(250);
    });

    it('should create a negative adjustment that subtracts points', () => {
      const transaction = Transaction.createAdjustment(
        'merchant_123',
        'customer_123',
        Points.from(50),
        Points.from(200),
        false,
        'adj_key_2',
      );

      expect(transaction.getType()).toBe(TransactionType.ADJUSTMENT);
      expect(transaction.getBalanceBefore().toNumber()).toBe(200);
      expect(transaction.getBalanceAfter().toNumber()).toBe(150);
    });

    it('should throw when creating adjustment with zero points', () => {
      expect(() =>
        Transaction.createAdjustment(
          'merchant_123',
          'customer_123',
          Points.from(0),
          Points.from(200),
          true,
          'adj_key_3',
        ),
      ).toThrow('Points must be greater than zero');
    });

    it('should throw when negative adjustment exceeds balance', () => {
      expect(() =>
        Transaction.createAdjustment(
          'merchant_123',
          'customer_123',
          Points.from(300),
          Points.from(200),
          false,
          'adj_key_4',
        ),
      ).toThrow();
    });

    it('should throw when completing an already completed transaction', () => {
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        'idempotency_123',
      );

      transaction.complete();
      expect(() => transaction.complete()).toThrow('Only pending transactions can be completed');
    });

    it('should set failure reason in metadata via fail()', () => {
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        'idempotency_123',
      );

      transaction.fail('Insufficient funds');

      expect(transaction.getStatus()).toBe(TransactionStatus.FAILED);
      expect(transaction.getMetadata().failureReason).toBe('Insufficient funds');
      expect(transaction.getCompletedAt()).toBeTruthy();
    });

    it('should throw when failing an already failed transaction', () => {
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        'idempotency_123',
      );

      transaction.fail('Reason 1');
      expect(() => transaction.fail('Reason 2')).toThrow('Only pending transactions can be failed');
    });

    it('should throw when reversing a pending transaction', () => {
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        'idempotency_123',
      );

      expect(() => transaction.reverse()).toThrow('Only completed transactions can be reversed');
    });

    it('should create a reversal with correct balance inversion', () => {
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        'idempotency_123',
      );

      transaction.complete();
      const reversal = transaction.createReversal('reversal_key_1');

      expect(reversal.getType()).toBe(TransactionType.REVERSAL);
      // Original: before=500, after=600. Reversal: before=600, after=500
      expect(reversal.getBalanceBefore().toNumber()).toBe(600);
      expect(reversal.getBalanceAfter().toNumber()).toBe(500);
    });

    it('should mark original transaction as reversed after createReversal', () => {
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        'idempotency_123',
      );

      transaction.complete();
      transaction.createReversal('reversal_key_2');

      expect(transaction.isReversed()).toBe(true);
      expect(transaction.getStatus()).toBe(TransactionStatus.REVERSED);
    });

    it('should preserve amount in reversal if present', () => {
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(50),
        Points.from(500),
        'idempotency_123',
      );

      transaction.complete();
      const reversal = transaction.createReversal('reversal_key_3');

      expect(reversal.getAmount()).toBeDefined();
      expect(reversal.getAmount()?.toSAR()).toBe(50);
    });

    it('should throw when creating reversal on already reversed transaction', () => {
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        'idempotency_123',
      );

      transaction.complete();
      transaction.createReversal('reversal_key_4');

      // Now the original is REVERSED, not COMPLETED
      expect(() => transaction.createReversal('reversal_key_5')).toThrow(
        'Can only reverse completed transactions',
      );
    });

    it('should include all fields in toJSON', () => {
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        'idempotency_123',
        { receiptNumber: 'R001' },
      );

      const json = transaction.toJSON();

      expect(json.transactionId).toBeTruthy();
      expect(json.merchantId).toBe('merchant_123');
      expect(json.customerId).toBe('customer_123');
      expect(json.type).toBe(TransactionType.EARN);
      expect(json.status).toBe(TransactionStatus.PENDING);
      expect(json.points).toBe(100);
      expect(json.amount).toEqual({ amount: 100, currency: 'SAR' });
      expect(json.balanceBefore).toBe(500);
      expect(json.balanceAfter).toBe(600);
      expect(json.metadata.receiptNumber).toBe('R001');
      expect(json.idempotencyKey).toBe('idempotency_123');
      expect(json.createdAt).toBeTruthy();
    });

    it('should preserve metadata when creating an earn transaction', () => {
      const metadata = {
        receiptNumber: 'R002',
        cashierName: 'Ali',
        terminalId: 'T01',
      };
      const transaction = Transaction.createEarn(
        'merchant_123',
        'customer_123',
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        'idempotency_123',
        metadata,
      );

      const retrievedMetadata = transaction.getMetadata();
      expect(retrievedMetadata.receiptNumber).toBe('R002');
      expect(retrievedMetadata.cashierName).toBe('Ali');
      expect(retrievedMetadata.terminalId).toBe('T01');
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
      expect(json.nextDecayDate).toBeDefined();
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

  it('should upgrade to Gold after earning 5,000 points', () => {
    const phone = new PhoneNumber('0501234567');
    const customer = Customer.create(phone);
    const merchantId = 'merchant_123';

    customer.enrollWithMerchant(merchantId);
    customer.grantConsent(merchantId);

    // Earn 5,000 points in one purchase
    customer.addPointsFromPurchase(merchantId, Points.from(5000), Points.from(5000));

    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.GOLD);
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

    // Tier should stay Platinum (redemptions don't affect tier)
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

    // Earn 3,000 more (now Gold with 6,000 total)
    customer.addPointsFromPurchase(merchantId, Points.from(3000), Points.from(3000));
    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.GOLD);
    expect(customer.getPointsToNextTier()).toBe(4000); // 10000 (Platinum) - 6000

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

    // New month: earn only 2,000 points (below Platinum's 10,000 threshold)
    customer.addPointsFromPurchase(merchantId, Points.from(2000), Points.from(2000));

    // Update tier based on new monthly progress
    const newTier = customer.updateTierFromProgress();

    // Should drop one level (Platinum → Gold)
    expect(newTier.getLevel()).toBe(CustomerTierLevel.GOLD);
    expect(customer.getCurrentTier().getLevel()).toBe(CustomerTierLevel.GOLD);
  });

  it('should have correct earning multiplier per tier', () => {
    const phone = new PhoneNumber('0501234567');
    const customer = Customer.create(phone);

    // Bronze: 1.0x earning, decays
    expect(customer.getEarningMultiplier()).toBe(1.0);
    expect(customer.isDecayImmune()).toBe(false);

    const merchantId = 'merchant_123';
    customer.enrollWithMerchant(merchantId);
    customer.grantConsent(merchantId);

    // Earn to Gold: 1.1x earning, decay immune
    customer.addPointsFromPurchase(merchantId, Points.from(5000), Points.from(5000));
    expect(customer.getEarningMultiplier()).toBe(1.1);
    expect(customer.isDecayImmune()).toBe(true);

    // Earn to Diamond: 1.2x earning, decay immune
    customer.addPointsFromPurchase(merchantId, Points.from(10000), Points.from(10000));
    expect(customer.getEarningMultiplier()).toBe(1.2);
    expect(customer.isDecayImmune()).toBe(true);
  });
});

describe('Domain Errors', () => {
  it('ValidationError should have code VALIDATION_ERROR and statusCode 400', () => {
    const error = new ValidationError('Field is invalid');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Field is invalid');
  });

  it('NotFoundError should format message correctly with statusCode 404', () => {
    const error = new NotFoundError('Customer', 'cust_123');
    expect(error.message).toBe('Customer not found: cust_123');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });

  it('ConflictError should have code CONFLICT and statusCode 409', () => {
    const error = new ConflictError('Resource already exists');
    expect(error.code).toBe('CONFLICT');
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Resource already exists');
  });

  it('UnauthorizedError should have default message Unauthorized and statusCode 401', () => {
    const error = new UnauthorizedError();
    expect(error.message).toBe('Unauthorized');
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.statusCode).toBe(401);
  });

  it('ForbiddenError should have default message Forbidden and statusCode 403', () => {
    const error = new ForbiddenError();
    expect(error.message).toBe('Forbidden');
    expect(error.code).toBe('FORBIDDEN');
    expect(error.statusCode).toBe(403);
  });

  it('InsufficientPointsError should format available/required and have statusCode 400', () => {
    const error = new InsufficientPointsError(50, 100);
    expect(error.message).toBe('Insufficient points: 50 available, 100 required');
    expect(error.code).toBe('INSUFFICIENT_POINTS');
    expect(error.statusCode).toBe(400);
  });

  it('all errors should be instances of DomainError and Error', () => {
    const errors = [
      new ValidationError('test'),
      new NotFoundError('Resource', 'id'),
      new ConflictError('test'),
      new UnauthorizedError(),
      new ForbiddenError(),
      new InsufficientPointsError(0, 1),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
    }
  });
});
