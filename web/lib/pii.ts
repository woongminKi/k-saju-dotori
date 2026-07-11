import 'server-only';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

function encKey(): Buffer {
  const hex = process.env.PII_ENC_KEY;
  if (!hex || hex.length !== 64) throw new Error('PII_ENC_KEY (64 hex chars) is required.');
  return Buffer.from(hex, 'hex');
}

function hashKey(): string {
  const k = process.env.PII_HASH_KEY;
  if (!k) throw new Error('PII_HASH_KEY is required.');
  return k;
}

/** AES-256-GCM. Output format: iv.tag.ciphertext (hex, '.' separated). */
export function encryptPII(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join('.');
}

export function decryptPII(blob: string): string {
  const parts = blob.split('.');
  const [ivHex, tagHex, dataHex] = parts;
  if (parts.length !== 3 || !ivHex || !tagHex || !dataHex) throw new Error('Invalid ciphertext format');
  const decipher = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}

/** Keyed hash over (menu + normalized input) for dedup lookups without decryption. Not guessable. */
export function birthHash(menu: string, normalizedInput: string): string {
  return createHmac('sha256', hashKey()).update(`${menu}|${normalizedInput}`).digest('hex');
}
