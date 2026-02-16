import { describe, expect, it } from 'vitest';
import { CustomerTier, CustomerTierLevel } from '../value-objects/CustomerTier';

describe('CustomerTier Value Object', () => {
  describe('Factory Methods', () => {
    it('should create tiers from level', () => {
      const bronze = CustomerTier.fromLevel(CustomerTierLevel.BRONZE);
      const gold = CustomerTier.fromLevel(CustomerTierLevel.GOLD);
      const platinum = CustomerTier.fromLevel(CustomerTierLevel.PLATINUM);
      const diamond = CustomerTier.fromLevel(CustomerTierLevel.DIAMOND);

      expect(bronze.getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(gold.getLevel()).toBe(CustomerTierLevel.GOLD);
      expect(platinum.getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(diamond.getLevel()).toBe(CustomerTierLevel.DIAMOND);
    });

    it('should create tiers from shortcuts', () => {
      const bronze = CustomerTier.bronze();
      const gold = CustomerTier.gold();
      const platinum = CustomerTier.platinum();
      const diamond = CustomerTier.diamond();

      expect(bronze.getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(gold.getLevel()).toBe(CustomerTierLevel.GOLD);
      expect(platinum.getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(diamond.getLevel()).toBe(CustomerTierLevel.DIAMOND);
    });

    it('should calculate tier from monthly progress', () => {
      expect(CustomerTier.fromMonthlyProgress(0).getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(CustomerTier.fromMonthlyProgress(4999).getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(CustomerTier.fromMonthlyProgress(5000).getLevel()).toBe(CustomerTierLevel.GOLD);
      expect(CustomerTier.fromMonthlyProgress(9999).getLevel()).toBe(CustomerTierLevel.GOLD);
      expect(CustomerTier.fromMonthlyProgress(10000).getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(CustomerTier.fromMonthlyProgress(14999).getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(CustomerTier.fromMonthlyProgress(15000).getLevel()).toBe(CustomerTierLevel.DIAMOND);
      expect(CustomerTier.fromMonthlyProgress(50000).getLevel()).toBe(CustomerTierLevel.DIAMOND);
    });
  });

  describe('Thresholds and Benefits', () => {
    it('should have correct monthly minimums', () => {
      expect(CustomerTier.bronze().getMonthlyMinimum()).toBe(0);
      expect(CustomerTier.gold().getMonthlyMinimum()).toBe(5000);
      expect(CustomerTier.platinum().getMonthlyMinimum()).toBe(10000);
      expect(CustomerTier.diamond().getMonthlyMinimum()).toBe(15000);
    });

    it('should have correct earning multipliers', () => {
      expect(CustomerTier.bronze().getEarningMultiplier()).toBe(1.0);
      expect(CustomerTier.gold().getEarningMultiplier()).toBe(1.1);
      expect(CustomerTier.platinum().getEarningMultiplier()).toBe(1.15);
      expect(CustomerTier.diamond().getEarningMultiplier()).toBe(1.2);
    });

    it('should have correct decay immunity', () => {
      expect(CustomerTier.bronze().isDecayImmune()).toBe(false);
      expect(CustomerTier.gold().isDecayImmune()).toBe(true);
      expect(CustomerTier.platinum().isDecayImmune()).toBe(true);
      expect(CustomerTier.diamond().isDecayImmune()).toBe(true);
    });

    it('should have display names', () => {
      expect(CustomerTier.bronze().getDisplayName()).toBe('Bronze');
      expect(CustomerTier.gold().getDisplayName()).toBe('Gold');
      expect(CustomerTier.platinum().getDisplayName()).toBe('Platinum');
      expect(CustomerTier.diamond().getDisplayName()).toBe('Diamond');
    });
  });

  describe('Comparison Methods', () => {
    it('should compare tier levels correctly', () => {
      const bronze = CustomerTier.bronze();
      const gold = CustomerTier.gold();
      const platinum = CustomerTier.platinum();
      const diamond = CustomerTier.diamond();

      expect(gold.isHigherThan(bronze)).toBe(true);
      expect(platinum.isHigherThan(gold)).toBe(true);
      expect(diamond.isHigherThan(platinum)).toBe(true);
      expect(bronze.isHigherThan(diamond)).toBe(false);

      expect(bronze.isLowerThan(gold)).toBe(true);
      expect(gold.isLowerThan(platinum)).toBe(true);
      expect(platinum.isLowerThan(diamond)).toBe(true);
      expect(diamond.isLowerThan(bronze)).toBe(false);
    });

    it('should check equality', () => {
      const bronze1 = CustomerTier.bronze();
      const bronze2 = CustomerTier.bronze();
      const gold = CustomerTier.gold();

      expect(bronze1.equals(bronze2)).toBe(true);
      expect(bronze1.equals(gold)).toBe(false);
    });
  });

  describe('Qualification', () => {
    it('should check tier qualification correctly', () => {
      const bronze = CustomerTier.bronze();
      const gold = CustomerTier.gold();
      const platinum = CustomerTier.platinum();
      const diamond = CustomerTier.diamond();

      expect(bronze.meetsQualification(0)).toBe(true);
      expect(bronze.meetsQualification(10000)).toBe(true);

      expect(gold.meetsQualification(4999)).toBe(false);
      expect(gold.meetsQualification(5000)).toBe(true);
      expect(gold.meetsQualification(10000)).toBe(true);

      expect(platinum.meetsQualification(9999)).toBe(false);
      expect(platinum.meetsQualification(10000)).toBe(true);
      expect(platinum.meetsQualification(15000)).toBe(true);

      expect(diamond.meetsQualification(14999)).toBe(false);
      expect(diamond.meetsQualification(15000)).toBe(true);
      expect(diamond.meetsQualification(50000)).toBe(true);
    });
  });

  describe('Decay', () => {
    it('should decay one level down', () => {
      const diamond = CustomerTier.diamond();
      const platinum = CustomerTier.platinum();
      const gold = CustomerTier.gold();
      const bronze = CustomerTier.bronze();

      expect(diamond.decay().getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(platinum.decay().getLevel()).toBe(CustomerTierLevel.GOLD);
      expect(gold.decay().getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(bronze.decay().getLevel()).toBe(CustomerTierLevel.BRONZE); // Can't go lower
    });
  });

  describe('Next Tier', () => {
    it('should return next tier above', () => {
      expect(CustomerTier.bronze().nextTier()?.getLevel()).toBe(CustomerTierLevel.GOLD);
      expect(CustomerTier.gold().nextTier()?.getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(CustomerTier.platinum().nextTier()?.getLevel()).toBe(CustomerTierLevel.DIAMOND);
      expect(CustomerTier.diamond().nextTier()).toBeNull();
    });

    it('should correctly identify max tier', () => {
      expect(CustomerTier.bronze().isMaxTier()).toBe(false);
      expect(CustomerTier.gold().isMaxTier()).toBe(false);
      expect(CustomerTier.platinum().isMaxTier()).toBe(false);
      expect(CustomerTier.diamond().isMaxTier()).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('toString() should return the tier level enum value', () => {
      expect(CustomerTier.bronze().toString()).toBe('BRONZE');
      expect(CustomerTier.gold().toString()).toBe('GOLD');
      expect(CustomerTier.platinum().toString()).toBe('PLATINUM');
      expect(CustomerTier.diamond().toString()).toBe('DIAMOND');
    });

    it('toJSON() should return the tier level enum value', () => {
      expect(CustomerTier.bronze().toJSON()).toBe('BRONZE');
      expect(CustomerTier.gold().toJSON()).toBe('GOLD');
      expect(CustomerTier.platinum().toJSON()).toBe('PLATINUM');
      expect(CustomerTier.diamond().toJSON()).toBe('DIAMOND');
    });

    it('getColor() should return a color string for each tier', () => {
      for (const tier of [
        CustomerTier.bronze(),
        CustomerTier.gold(),
        CustomerTier.platinum(),
        CustomerTier.diamond(),
      ]) {
        expect(tier.getColor()).toEqual(expect.any(String));
        expect(tier.getColor()).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('Edge Cases', () => {
    it('comparing same tier: isHigherThan returns false', () => {
      const bronze = CustomerTier.bronze();
      expect(bronze.isHigherThan(bronze)).toBe(false);
    });

    it('comparing same tier: isLowerThan returns false', () => {
      const bronze = CustomerTier.bronze();
      expect(bronze.isLowerThan(bronze)).toBe(false);
    });

    it('fromMonthlyProgress exactly at thresholds', () => {
      expect(CustomerTier.fromMonthlyProgress(0).getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(CustomerTier.fromMonthlyProgress(5000).getLevel()).toBe(CustomerTierLevel.GOLD);
      expect(CustomerTier.fromMonthlyProgress(10000).getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(CustomerTier.fromMonthlyProgress(15000).getLevel()).toBe(CustomerTierLevel.DIAMOND);
    });

    it('fromMonthlyProgress just below thresholds', () => {
      expect(CustomerTier.fromMonthlyProgress(4999).getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(CustomerTier.fromMonthlyProgress(9999).getLevel()).toBe(CustomerTierLevel.GOLD);
      expect(CustomerTier.fromMonthlyProgress(14999).getLevel()).toBe(CustomerTierLevel.PLATINUM);
    });

    it('getThresholds() returns object with earningMultiplier, decays, and monthlyMinimum', () => {
      const thresholds = CustomerTier.bronze().getThresholds();

      expect(thresholds).toHaveProperty('earningMultiplier');
      expect(thresholds).toHaveProperty('decays');
      expect(thresholds).toHaveProperty('monthlyMinimum');
    });

    it('getThresholds() does NOT have redemptionMultiplier', () => {
      for (const tier of [
        CustomerTier.bronze(),
        CustomerTier.gold(),
        CustomerTier.platinum(),
        CustomerTier.diamond(),
      ]) {
        expect(tier.getThresholds()).not.toHaveProperty('redemptionMultiplier');
      }
    });

    it('getDisplayName matches toString of display name', () => {
      for (const tier of [
        CustomerTier.bronze(),
        CustomerTier.gold(),
        CustomerTier.platinum(),
        CustomerTier.diamond(),
      ]) {
        expect(tier.getDisplayName()).toBe(tier.getThresholds().displayName);
      }
    });
  });

  describe('Tier Constants', () => {
    it('Bronze monthly minimum should be 0', () => {
      expect(CustomerTier.bronze().getMonthlyMinimum()).toBe(0);
    });

    it('Gold monthly minimum should be 5000', () => {
      expect(CustomerTier.gold().getMonthlyMinimum()).toBe(5000);
    });

    it('Platinum monthly minimum should be 10000', () => {
      expect(CustomerTier.platinum().getMonthlyMinimum()).toBe(10000);
    });

    it('Diamond monthly minimum should be 15000', () => {
      expect(CustomerTier.diamond().getMonthlyMinimum()).toBe(15000);
    });

    it('CustomerTierLevel enum should have all 4 levels', () => {
      const levels = Object.values(CustomerTierLevel);
      expect(levels).toHaveLength(4);
      expect(levels).toContain(CustomerTierLevel.BRONZE);
      expect(levels).toContain(CustomerTierLevel.GOLD);
      expect(levels).toContain(CustomerTierLevel.PLATINUM);
      expect(levels).toContain(CustomerTierLevel.DIAMOND);
    });
  });
});
