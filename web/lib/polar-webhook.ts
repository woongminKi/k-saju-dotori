import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Standard Webhooks (https://github.com/standard-webhooks/standard-webhooks) signature verification,
 * as implemented by Polar. Pure + dependency-free so it is unit-testable against real HMAC signatures.
 *
 * Security notes (this is the money-path gatekeeper — every detail is load-bearing):
 *  - Signed content is the dot-joined `${id}.${timestamp}.${rawBody}` — `rawBody` MUST be the exact raw
 *    request bytes (read via `req.text()`), never a re-serialized JSON object.
 *  - The secret is `whsec_<base64>`; the `whsec_` prefix is stripped and the remainder base64-DECODED to
 *    the raw HMAC key bytes (Polar's docs flag "using the secret as a raw string" as a common gotcha).
 *  - The `webhook-signature` header is a space-delimited list of `v1,<base64sig>` entries (more than one
 *    during a secret rotation). If ANY entry matches, the signature is valid.
 *  - Comparison is constant-time (`timingSafeEqual` on decoded buffers). A length pre-check guards the
 *    throw-on-mismatched-length behavior of `timingSafeEqual`; a wrong-length entry is simply skipped (a
 *    valid v1 HMAC-SHA256 signature is always 32 bytes, so this leaks nothing exploitable).
 *  - The timestamp is validated against a tolerance window INDEPENDENTLY of the signature, so a replayed
 *    payload with an otherwise-valid signature but a stale timestamp is still rejected.
 */

/** Tolerance (seconds, each direction) for the webhook timestamp vs. now — rejects replayed/stale deliveries. */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

export interface PolarWebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

/**
 * Verify a Standard Webhooks signature. Returns true only when the timestamp is within tolerance AND at
 * least one `v1,` signature entry matches. `nowSeconds` is injectable for testing (defaults to real time).
 */
export function verifyPolarSignature(
  rawBody: string,
  headers: PolarWebhookHeaders,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  // Timestamp tolerance — checked independently of the signature so a stale-but-signed replay is rejected.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(nowSeconds - ts) > WEBHOOK_TOLERANCE_SECONDS) return false;

  // Secret: strip the whsec_ prefix, then base64-decode to the raw HMAC key bytes.
  const base64Secret = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  const key = Buffer.from(base64Secret, 'base64');
  if (key.length === 0) return false;

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', key).update(signedContent).digest();

  for (const entry of signature.split(' ')) {
    const comma = entry.indexOf(',');
    if (comma < 0) continue;
    const version = entry.slice(0, comma);
    const b64 = entry.slice(comma + 1);
    if (version !== 'v1' || !b64) continue;
    const provided = Buffer.from(b64, 'base64');
    // Length pre-check before timingSafeEqual (which throws on mismatched lengths). A valid v1 signature is
    // always 32 bytes; a wrong length can't match, so skipping is correct and leaks no useful timing signal.
    if (provided.length !== expected.length) continue;
    if (timingSafeEqual(provided, expected)) return true;
  }
  return false;
}
