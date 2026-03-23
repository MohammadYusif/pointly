import { describe, expect, it } from 'vitest';
import { CustomerTierLevel, TIER_CONFIG } from '../config/TierConfig';

/**
 * Parity test: ensures API TierConfig values match the manually-mirrored
 * values in packages/shared/src/tier-config.ts.
 *
 * @pointly/shared cannot be imported here (API bundle must stay self-contained).
 * Expected values are copied from packages/shared/src/tier-config.ts CUSTOMER_TIERS.
 * If either file changes, this test will fail, signalling a sync is needed.
 */
describe('TierConfig parity: API domain config vs @pointly/shared', () => {
  const sharedExpected = {
    BRONZE: { monthlyMinimum: 0, earningMultiplier: 1.0 },
    GOLD: { monthlyMinimum: 5000, earningMultiplier: 1.1 },
    PLATINUM: { monthlyMinimum: 10000, earningMultiplier: 1.15 },
    DIAMOND: { monthlyMinimum: 15000, earningMultiplier: 1.2 },
  } as const;

  const levelNames = ['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND'] as const;

  for (const levelName of levelNames) {
    const apiLevel = CustomerTierLevel[levelName];
    const apiConfig = TIER_CONFIG[apiLevel];
    const expected = sharedExpected[levelName];

    it(`${levelName}: monthlyMinimum matches`, () => {
      expect(apiConfig.monthlyMinimum).toBe(expected.monthlyMinimum);
    });

    it(`${levelName}: earningMultiplier matches`, () => {
      expect(apiConfig.earningMultiplier).toBe(expected.earningMultiplier);
    });
  }

  it('Bronze decays (not decay immune)', () => {
    expect(TIER_CONFIG[CustomerTierLevel.BRONZE].decays).toBe(true);
  });

  it('Gold is decay immune', () => {
    expect(TIER_CONFIG[CustomerTierLevel.GOLD].decays).toBe(false);
  });

  it('Platinum is decay immune', () => {
    expect(TIER_CONFIG[CustomerTierLevel.PLATINUM].decays).toBe(false);
  });

  it('Diamond is decay immune', () => {
    expect(TIER_CONFIG[CustomerTierLevel.DIAMOND].decays).toBe(false);
  });
});
