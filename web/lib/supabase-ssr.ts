import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/** Request-cookie-based Supabase client (session read/write). Use in Server Components / Route Handlers. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const anon = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (!url || !anon) throw new Error('Supabase not configured: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Cookie writes throw on the Server Component render path (read-only).
          // Session-refresh writes happen in Route Handlers / Server Actions, so this is safe to ignore here.
        }
      },
    },
  });
}
