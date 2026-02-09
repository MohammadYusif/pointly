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

    it('should have correct earning multipliers', () => {
      expect(CustomerTier.bronze().getEarningMultiplier()).toBe(1.0);
      expect(CustomerTier.platinum().getEarningMultiplier()).toBe(1.1);
      expect(CustomerTier.diamond().getEarningMultiplier()).toBe(1.2);
    });

    it('should have correct decay immunity', () => {
      expect(CustomerTier.bronze().isDecayImmune()).toBe(false);
      expect(CustomerTier.platinum().isDecayImmune()).toBe(true);
      expect(CustomerTier.diamond().isDecayImmune()).toBe(true);
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

  describe('Serialization', () => {
    it('toString() should return the tier level enum value', () => {
      expect(CustomerTier.bronze().toString()).toBe('BRONZE');
      expect(CustomerTier.platinum().toString()).toBe('PLATINUM');
      expect(CustomerTier.diamond().toString()).toBe('DIAMOND');
    });

    it('toJSON() should return the tier level enum value', () => {
      expect(CustomerTier.bronze().toJSON()).toBe('BRONZE');
      expect(CustomerTier.platinum().toJSON()).toBe('PLATINUM');
      expect(CustomerTier.diamond().toJSON()).toBe('DIAMOND');
    });

    it('getColor() should return a color string for each tier', () => {
      expect(CustomerTier.bronze().getColor()).toEqual(expect.any(String));
      expect(CustomerTier.bronze().getColor()).toMatch(/^#[0-9A-Fa-f]{6}$/);

      expect(CustomerTier.platinum().getColor()).toEqual(expect.any(String));
      expect(CustomerTier.platinum().getColor()).toMatch(/^#[0-9A-Fa-f]{6}$/);

      expect(CustomerTier.diamond().getColor()).toEqual(expect.any(String));
      expect(CustomerTier.diamond().getColor()).toMatch(/^#[0-9A-Fa-f]{6}$/);
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
      expect(CustomerTier.fromMonthlyProgress(5000).getLevel()).toBe(CustomerTierLevel.PLATINUM);
      expect(CustomerTier.fromMonthlyProgress(15000).getLevel()).toBe(CustomerTierLevel.DIAMOND);
    });

    it('fromMonthlyProgress just below thresholds', () => {
      expect(CustomerTier.fromMonthlyProgress(4999).getLevel()).toBe(CustomerTierLevel.BRONZE);
      expect(CustomerTier.fromMonthlyProgress(14999).getLevel()).toBe(CustomerTierLevel.PLATINUM);
    });

    it('getThresholds() returns object with earningMultiplier, decays, and monthlyMinimum', () => {
      const thresholds = CustomerTier.bronze().getThresholds();

      expect(thresholds).toHaveProperty('earningMultiplier');
      expect(thresholds).toHaveProperty('decays');
      expect(thresholds).toHaveProperty('monthlyMinimum');
    });

    it('getThresholds() does NOT have redemptionMultiplier', () => {
      const bronzeThresholds = CustomerTier.bronze().getThresholds();
      const platinumThresholds = CustomerTier.platinum().getThresholds();
      const diamondThresholds = CustomerTier.diamond().getThresholds();

      expect(bronzeThresholds).not.toHaveProperty('redemptionMultiplier');
      expect(platinumThresholds).not.toHaveProperty('redemptionMultiplier');
      expect(diamondThresholds).not.toHaveProperty('redemptionMultiplier');
    });

    it('getDisplayName matches toString of display name', () => {
      const bronze = CustomerTier.bronze();
      const platinum = CustomerTier.platinum();
      const diamond = CustomerTier.diamond();

      expect(bronze.getDisplayName()).toBe(bronze.getThresholds().displayName);
      expect(platinum.getDisplayName()).toBe(platinum.getThresholds().displayName);
      expect(diamond.getDisplayName()).toBe(diamond.getThresholds().displayName);
    });
  });

  describe('Tier Constants', () => {
    it('Bronze monthly minimum should be 0', () => {
      expect(CustomerTier.bronze().getMonthlyMinimum()).toBe(0);
    });

    it('Platinum monthly minimum should be 5000', () => {
      expect(CustomerTier.platinum().getMonthlyMinimum()).toBe(5000);
    });

    it('Diamond monthly minimum should be 15000', () => {
      expect(CustomerTier.diamond().getMonthlyMinimum()).toBe(15000);
    });

    it('CustomerTierLevel enum should have all 3 levels', () => {
      const levels = Object.values(CustomerTierLevel);
      expect(levels).toHaveLength(3);
      expect(levels).toContain(CustomerTierLevel.BRONZE);
      expect(levels).toContain(CustomerTierLevel.PLATINUM);
      expect(levels).toContain(CustomerTierLevel.DIAMOND);
    });
  });
});
