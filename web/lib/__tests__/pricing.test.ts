import { describe, it, expect } from 'vitest';
import { CREDIT_PACKAGES, ORACLE_PACKAGES, findPackage, findPackageFor } from '../pricing';

describe('pricing', () => {
  it('reading packages are 1/3/5 units', () => {
    expect(CREDIT_PACKAGES.map((p) => p.units)).toEqual([1, 3, 5]);
  });

  it('reading price mapping (USD cents)', () => {
    expect(findPackage(1).amountCents).toBe(499);
    expect(findPackage(3).amountCents).toBe(1199);
    expect(findPackage(5).amountCents).toBe(1799);
  });

  it('oracle packages are 12/30/80 units', () => {
    expect(ORACLE_PACKAGES.map((p) => p.units)).toEqual([12, 30, 80]);
  });

  it('oracle price mapping (USD cents)', () => {
    expect(findPackageFor('oracle', 12).amountCents).toBe(199);
    expect(findPackageFor('oracle', 30).amountCents).toBe(299);
    expect(findPackageFor('oracle', 80).amountCents).toBe(599);
  });

  it('unknown package throws', () => {
    expect(() => findPackage(2)).toThrow();
    expect(() => findPackageFor('oracle', 1)).toThrow();
    expect(() => findPackageFor('oracle', 5)).toThrow(); // old pack size, removed
  });
});
