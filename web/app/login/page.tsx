import { redirect } from 'next/navigation';
import { supabaseServer } from '../../lib/supabase-ssr';
import { safeNextPath } from '../../lib/safe-next';

export const metadata = { title: 'Log in' };

async function loginWithGoogle(next: string) {
  'use server';
  const sb = await supabaseServer();
  const base = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';
  const redirectTo = `${base}/api/auth/callback${next && next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error || !data.url) throw new Error('Failed to start Google sign-in');
  redirect(data.url);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const safeNext = safeNextPath(next);

  return (
    <section className="space-y-6 text-center">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Log in</h1>
      <p className="text-bark/70">Sign in with Google to keep your credits and reading history on your account.</p>
      {error === 'auth' ? (
        <p className="rounded-lg border border-blush/40 bg-blush/10 px-4 py-3 text-sm text-bark">
          Sign-in failed. Please try again.
        </p>
      ) : null}
      <form action={loginWithGoogle.bind(null, safeNext)} className="flex justify-center">
        {/* Official "Sign in with Google" button styling — white surface, Google 'G', Roboto-ish label. */}
        <button
          type="submit"
          className="inline-flex items-center gap-3 rounded-md border border-[#747775] bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] shadow-sm transition hover:bg-[#f8f9fa]"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
          </svg>
          Sign in with Google
        </button>
      </form>
    </section>
  );
}
