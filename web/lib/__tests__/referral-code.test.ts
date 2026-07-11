import { describe, it, expect } from 'vitest';
import { generateReferralCode, isValidReferralCode } from '../referral-code';

describe('referral-code', () => {
  it('format: DOTORI- + 4 uppercase/digit chars (look-alikes excluded)', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateReferralCode();
      expect(code).toMatch(/^DOTORI-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    }
  });

  it('isValidReferralCode: valid vs invalid', () => {
    expect(isValidReferralCode('DOTORI-8F3A')).toBe(true);
    expect(isValidReferralCode('dotori-8f3a')).toBe(false);
    expect(isValidReferralCode('DOTORI-8F3')).toBe(false);
    expect(isValidReferralCode('DOTORI-8F3AB')).toBe(false);
    expect(isValidReferralCode('DOTORI-8O1I')).toBe(false);
    expect(isValidReferralCode('XYZ-8F3A')).toBe(false);
    expect(isValidReferralCode('')).toBe(false);
  });

  it('sufficiently unique (no collisions across 200)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(generateReferralCode());
    expect(seen.size).toBeGreaterThan(190);
  });
});
