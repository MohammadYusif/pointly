import { describe, it, expect } from "vitest";
import {
  Customer,
  Merchant,
  Transaction,
  PhoneNumber,
  Email,
  Money,
  Points,
  MerchantTier,
  TransactionType,
} from "../index";

describe("Domain Entities", () => {
  describe("Value Objects", () => {
    it("should create a valid Saudi phone number", () => {
      const phone = new PhoneNumber("0501234567");
      expect(phone.toString()).toBe("966501234567");
      expect(phone.toE164()).toBe("+966501234567");
      expect(phone.toLocal()).toBe("0501234567");
    });

    it("should create a valid email", () => {
      const email = new Email("test@example.com");
      expect(email.toString()).toBe("test@example.com");
      expect(email.getDomain()).toBe("example.com");
    });

    it("should handle money calculations correctly", () => {
      const money1 = Money.fromSAR(100);
      const money2 = Money.fromSAR(50);
      const sum = money1.add(money2);

      expect(sum.toSAR()).toBe(150);
      expect(sum.toString()).toBe("150.00 SAR");
    });

    it("should handle points calculations correctly", () => {
      const points1 = Points.from(100);
      const points2 = Points.from(50);
      const sum = points1.add(points2);

      expect(sum.toNumber()).toBe(150);
    });
  });

  describe("Customer Entity", () => {
    it("should create a new customer with zero global points", () => {
      const phone = new PhoneNumber("0501234567");
      const customer = Customer.create(phone, "Ahmed Al-Saud");

      expect(customer.getPhone()).toBe(phone);
      expect(customer.getName()).toBe("Ahmed Al-Saud");
      expect(customer.getCustomerId()).toBeTruthy();
      expect(customer.getGlobalPointsBalance().toNumber()).toBe(0);
      expect(customer.getGlobalLifetimePoints().toNumber()).toBe(0);
    });

    it("should enroll customer with merchant", () => {
      const phone = new PhoneNumber("0501234567");
      const customer = Customer.create(phone);
      const merchantId = "merchant_123";

      customer.enrollWithMerchant(merchantId);
      const enrollment = customer.getEnrollment(merchantId);

      expect(enrollment).toBeTruthy();
      expect(enrollment?.merchantId).toBe(merchantId);
      expect(enrollment?.merchantPointsBalance.toNumber()).toBe(0);
    });

    it("should add dual points from purchase", () => {
      const phone = new PhoneNumber("0501234567");
      const customer = Customer.create(phone);
      const merchantId = "merchant_123";

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);
      customer.addPointsFromPurchase(
        merchantId,
        Points.from(150), // global points (1.5x)
        Points.from(100), // merchant points (1x)
      );

      expect(customer.getGlobalPointsBalance().toNumber()).toBe(150);
      expect(customer.getMerchantPointsBalance(merchantId).toNumber()).toBe(
        100,
      );
    });

    it("should redeem global points", () => {
      const phone = new PhoneNumber("0501234567");
      const customer = Customer.create(phone);
      const merchantId = "merchant_123";

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);
      customer.addPointsFromPurchase(
        merchantId,
        Points.from(200),
        Points.from(100),
      );

      customer.redeemGlobalPoints(Points.from(50));

      expect(customer.getGlobalPointsBalance().toNumber()).toBe(150);
      expect(customer.getGlobalLifetimePoints().toNumber()).toBe(200);
    });

    it("should redeem merchant points", () => {
      const phone = new PhoneNumber("0501234567");
      const customer = Customer.create(phone);
      const merchantId = "merchant_123";

      customer.enrollWithMerchant(merchantId);
      customer.grantConsent(merchantId);
      customer.addPointsFromPurchase(
        merchantId,
        Points.from(150),
        Points.from(100),
      );

      customer.redeemMerchantPoints(merchantId, Points.from(30));

      expect(customer.getMerchantPointsBalance(merchantId).toNumber()).toBe(70);
    });
  });

  describe("Merchant Entity", () => {
    it("should create a new merchant with default location", () => {
      const email = new Email("test@example.com");
      const phone = new PhoneNumber("0501234567");
      const merchant = Merchant.create(
        "Test Store",
        email,
        phone,
        "Ahmed",
        MerchantTier.BASIC,
      );

      expect(merchant.getBusinessName()).toBe("Test Store");
      expect(merchant.getTier()).toBe(MerchantTier.BASIC);
      expect(merchant.getMerchantId()).toBeTruthy();
      expect(merchant.getLocations()).toHaveLength(1);
      expect(merchant.getMaxLocations()).toBe(1);
    });

    it("should calculate dual points for purchase", () => {
      const email = new Email("test@example.com");
      const phone = new PhoneNumber("0501234567");
      const merchant = Merchant.create(
        "Test Store",
        email,
        phone,
        "Ahmed",
        MerchantTier.BASIC,
      );

      merchant.verify();

      const points = merchant.calculatePointsForPurchase(100);
      expect(points.merchantPoints).toBe(100);
      expect(points.globalPoints).toBe(100); // 1x for BASIC
    });

    it("should calculate higher global points for PROFESSIONAL tier", () => {
      const email = new Email("test@example.com");
      const phone = new PhoneNumber("0501234567");
      const merchant = Merchant.create(
        "Test Store",
        email,
        phone,
        "Ahmed",
        MerchantTier.PROFESSIONAL,
      );

      merchant.verify();

      const points = merchant.calculatePointsForPurchase(100);
      expect(points.merchantPoints).toBe(100);
      expect(points.globalPoints).toBe(150); // 1.5x for PROFESSIONAL
    });

    it("should calculate highest global points for ENTERPRISE tier", () => {
      const email = new Email("test@example.com");
      const phone = new PhoneNumber("0501234567");
      const merchant = Merchant.create(
        "Test Store",
        email,
        phone,
        "Ahmed",
        MerchantTier.ENTERPRISE,
      );

      merchant.verify();

      const points = merchant.calculatePointsForPurchase(100);
      expect(points.merchantPoints).toBe(100);
      expect(points.globalPoints).toBe(200); // 2x for ENTERPRISE
    });

    it("should upgrade tier and update maxLocations", () => {
      const email = new Email("test@example.com");
      const phone = new PhoneNumber("0501234567");
      const merchant = Merchant.create(
        "Test Store",
        email,
        phone,
        "Ahmed",
        MerchantTier.BASIC,
      );

      expect(merchant.getMaxLocations()).toBe(1);

      merchant.upgradeTier(MerchantTier.PROFESSIONAL);
      expect(merchant.getTier()).toBe(MerchantTier.PROFESSIONAL);
      expect(merchant.getMaxLocations()).toBe(3);
    });

    it("should allow adding locations for PROFESSIONAL tier", () => {
      const email = new Email("test@example.com");
      const phone = new PhoneNumber("0501234567");
      const merchant = Merchant.create(
        "Test Store",
        email,
        phone,
        "Ahmed",
        MerchantTier.PROFESSIONAL,
      );

      const newLocation = merchant.addLocation(
        "Branch 2",
        "123 Main St",
        "Riyadh",
      );

      expect(newLocation.name).toBe("Branch 2");
      expect(merchant.getLocations()).toHaveLength(2);
    });

    it("should not allow adding locations for BASIC tier", () => {
      const email = new Email("test@example.com");
      const phone = new PhoneNumber("0501234567");
      const merchant = Merchant.create(
        "Test Store",
        email,
        phone,
        "Ahmed",
        MerchantTier.BASIC,
      );

      expect(() => {
        merchant.addLocation("Branch 2", "123 Main St", "Riyadh");
      }).toThrow("Multi-location is not enabled for this tier");
    });

    it("should deactivate location", () => {
      const email = new Email("test@example.com");
      const phone = new PhoneNumber("0501234567");
      const merchant = Merchant.create(
        "Test Store",
        email,
        phone,
        "Ahmed",
        MerchantTier.PROFESSIONAL,
      );

      const newLocation = merchant.addLocation(
        "Branch 2",
        "123 Main St",
        "Riyadh",
      );
      merchant.deactivateLocation(newLocation.locationId);

      expect(merchant.getActiveLocations()).toHaveLength(1);
      expect(merchant.getLocations()).toHaveLength(2);
    });
  });

  describe("Transaction Entity", () => {
    it("should create an earn transaction", () => {
      const transaction = Transaction.createEarn(
        "merchant_123",
        "customer_123",
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        "idempotency_123",
      );

      expect(transaction.getType()).toBe(TransactionType.EARN);
      expect(transaction.getPoints().toNumber()).toBe(100);
      expect(transaction.getBalanceBefore().toNumber()).toBe(500);
      expect(transaction.getBalanceAfter().toNumber()).toBe(600);
    });

    it("should create a redeem transaction", () => {
      const transaction = Transaction.createRedeem(
        "merchant_123",
        "customer_123",
        Points.from(100),
        Money.fromSAR(1),
        Points.from(500),
        "idempotency_123",
      );

      expect(transaction.getType()).toBe(TransactionType.REDEEM);
      expect(transaction.getPoints().toNumber()).toBe(100);
      expect(transaction.getBalanceAfter().toNumber()).toBe(400);
    });

    it("should complete a transaction", () => {
      const transaction = Transaction.createEarn(
        "merchant_123",
        "customer_123",
        Points.from(100),
        Money.fromSAR(100),
        Points.from(500),
        "idempotency_123",
      );

      transaction.complete();
      expect(transaction.getCompletedAt()).toBeTruthy();
    });
  });
});
