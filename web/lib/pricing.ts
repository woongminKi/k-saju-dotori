export interface CreditPackage {
  /** Number of units (credits) added. */
  units: number;
  /** Price in the smallest currency unit (USD cents). */
  amountCents: number;
}

/** Product kind. reading = reading units, oracle = oracle-draw credits. */
export type ProductKind = 'reading' | 'oracle';

export const CREDIT_PACKAGES: CreditPackage[] = [
  { units: 1, amountCents: 499 },
  { units: 3, amountCents: 1199 },
  { units: 5, amountCents: 1799 },
];

// Oracle-draw credits — a single short answer, so much cheaper than reading units.
export const ORACLE_PACKAGES: CreditPackage[] = [
  { units: 12, amountCents: 199 },
  { units: 30, amountCents: 299 },
  { units: 80, amountCents: 599 },
];

export function packagesFor(product: ProductKind): CreditPackage[] {
  return product === 'oracle' ? ORACLE_PACKAGES : CREDIT_PACKAGES;
}

export function findPackage(units: number): CreditPackage {
  return findPackageFor('reading', units);
}

export function findPackageFor(product: ProductKind, units: number): CreditPackage {
  const pkg = packagesFor(product).find((p) => p.units === units);
  if (!pkg) throw new Error(`Unknown package: ${units} units`);
  return pkg;
}
