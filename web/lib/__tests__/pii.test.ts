import { describe, it, expect, beforeAll } from 'vitest';
import { encryptPII, decryptPII, birthHash } from '../pii';

beforeAll(() => {
  process.env.PII_ENC_KEY = '0'.repeat(64); // 32-byte hex
  process.env.PII_HASH_KEY = 'test-hash-key';
});

describe('pii', () => {
  it('encrypt -> decrypt round-trip', () => {
    const plain = JSON.stringify({ y: 1990, m: 5, d: 15, city: 'New York' });
    const blob = encryptPII(plain);
    expect(blob).not.toContain('1990'); // no plaintext exposure
    expect(decryptPII(blob)).toBe(plain);
  });

  it('same input -> same birthHash, different input -> different', () => {
    const a = birthHash('solo', '1990-5-15-M');
    const b = birthHash('solo', '1990-5-15-M');
    const c = birthHash('solo', '1990-5-16-M');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('different menu -> different birthHash', () => {
    expect(birthHash('solo', 'x')).not.toBe(birthHash('couple', 'x'));
  });

  it('invalid ciphertext throws', () => {
    expect(() => decryptPII('garbage')).toThrow();
  });
});
