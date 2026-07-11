import { cookies } from 'next/headers';

export const REF_COOKIE = 'dotori_ref';

export async function readRefCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REF_COOKIE)?.value;
}

export async function clearRefCookie(): Promise<void> {
  const store = await cookies();
  store.delete(REF_COOKIE);
}
