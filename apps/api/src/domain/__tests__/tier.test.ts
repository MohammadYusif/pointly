import { describe, expect, it } from 'vitest';
import { CustomerTier, CustomerTierLevel } from '../value-objects/CustomerTier';

describe('CustomerTier Value Object', () => {
  describe('Factory Methods', () => {
    it('should create tiers from level', () => {
      const bronze = CustomerTier.fromLevel(CustomerTierLevel.BRONZE);
      const platinum = CustomerTier.fromLevel(CustomerTierLevel.PLATINUM);
      const diamond = CustomerTier.fromLevel(CustomerTierLevel.DIAMOND);

      expect(bronze.getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(platinum.getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(diamond.getLevel()).toBe(CustomerTierLevel.DIAMOND);
    });

    it('should create tiers from shortcuts', () => {
      const bronze = CustomerTier.bronze();
      const platinum = CustomerTier.platinum();
      const diamond = CustomerTier.diamond();

      expect(bronze.getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(platinum.getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(diamond.getLevel()).toBe(CustomerTierLevel.DIAMOND);
    });

    it('should calculate tier from monthly progress', () => {
      expect(CustomerTier.fromMonthlyProgress(0).getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(CustomerTier.fromMonthlyProgress(4999).getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(CustomerTier.fromMonthlyProgress(5000).getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(CustomerTier.fromMonthlyProgress(14999).getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(CustomerTier.fromMonthlyProgress(15000).getLevel()).toBe(CustomerTierLevel.DIAMOND);
      expect(CustomerTier.fromMonthlyProgress(50000).getLevel()).toBe(CustomerTierLevel.DIAMOND);
    });
  });

  describe('Thresholds and Benefits', () => {
    it('should have correct monthly minimums', () => {
      expect(CustomerTier.bronze().getMonthlyMinimum()).toBe(0);
      expect(CustomerTier.platinum().getMonthlyMinimum()).toBe(5000);
      expect(CustomerTier.diamond().getMonthlyMinimum()).toBe(15000);
    });

    it('should have correct redemption multipliers', () => {
      expect(CustomerTier.bronze().getRedemptionMultiplier()).toBe(1.0);
      expect(CustomerTier.platinum().getRedemptionMultiplier()).toBe(1.2);
      expect(CustomerTier.diamond().getRedemptionMultiplier()).toBe(1.5);
    });

    it('should have display names', () => {
      expect(CustomerTier.bronze().getDisplayName()).toBe('Bronze');
      expect(CustomerTier.platinum().getDisplayName()).toBe('Platinum');
      expect(CustomerTier.diamond().getDisplayName()).toBe('Diamond');
    });
  });

  describe('Comparison Methods', () => {
    it('should compare tier levels correctly', () => {
      const bronze = CustomerTier.bronze();
      const platinum = CustomerTier.platinum();
      const diamond = CustomerTier.diamond();

      expect(platinum.isHigherThan(bronze)).toBe(true);
      expect(diamond.isHigherThan(platinum)).toBe(true);
      expect(bronze.isHigherThan(diamond)).toBe(false);

      expect(bronze.isLowerThan(platinum)).toBe(true);
      expect(platinum.isLowerThan(diamond)).toBe(true);
      expect(diamond.isLowerThan(bronze)).toBe(false);
    });

    it('should check equality', () => {
      const bronze1 = CustomerTier.bronze();
      const bronze2 = CustomerTier.bronze();
      const platinum = CustomerTier.platinum();

      expect(bronze1.equals(bronze2)).toBe(true);
      expect(bronze1.equals(platinum)).toBe(false);
    });
  });

  describe('Qualification', () => {
    it('should check tier qualification correctly', () => {
      const bronze = CustomerTier.bronze();
      const platinum = CustomerTier.platinum();
      const diamond = CustomerTier.diamond();

      expect(bronze.meetsQualification(0)).toBe(true);
      expect(bronze.meetsQualification(10000)).toBe(true);

      expect(platinum.meetsQualification(4999)).toBe(false);
      expect(platinum.meetsQualification(5000)).toBe(true);
      expect(platinum.meetsQualification(10000)).toBe(true);

      expect(diamond.meetsQualification(14999)).toBe(false);
      expect(diamond.meetsQualification(15000)).toBe(true);
      expect(diamond.meetsQualification(50000)).toBe(true);
    });
  });

  describe('Decay', () => {
    it('should decay one level down', () => {
      const diamond = CustomerTier.diamond();
      const platinum = CustomerTier.platinum();
      const bronze = CustomerTier.bronze();

      expect(diamond.decay().getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(platinum.decay().getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(bronze.decay().getLevel()).toBe(CustomerTierLevel.BRONZE); // Can't go lower
    });
  });
});
