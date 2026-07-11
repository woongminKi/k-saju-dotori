const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes look-alikes 0/O/1/I
const CODE_RE = /^DOTORI-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

export function generateReferralCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += ALPHABET.charAt(b % ALPHABET.length);
  return `DOTORI-${s}`;
}

export function isValidReferralCode(code: string): boolean {
  return CODE_RE.test(code);
}
