import Link from 'next/link';
import { getAuth, getStore } from '../../lib/services';
import { pointsBalance } from '../../lib/points';
import { readRefCookie } from '../../lib/ref-cookie';
import { buttonClass } from '../../components/ui/Button';
import { ReferralForm } from './ReferralForm';
import { CopyButton } from './CopyButton';

export const dynamic = 'force-dynamic';

export default async function InvitePage() {
  const user = await getAuth().getCurrentUser();
  if (!user) {
    return (
      <section className="space-y-4">
        <p className="text-bark/70">Please log in first.</p>
        <Link href="/" className={buttonClass('ghost', 'sm')}>Go home</Link>
      </section>
    );
  }

  const balance = await pointsBalance(getStore(), user.id);
  const siteUrl = process.env['NEXT_PUBLIC_SITE_URL'] ?? '';
  const shareUrl = `${siteUrl}/?ref=${user.referralCode}`;
  const cookieCode = await readRefCookie();

  return (
    <section className="space-y-6">
      <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-sand">
        <span aria-hidden="true" className="text-5xl">🌰</span>
      </div>
      <h1 className="text-2xl font-extrabold text-acorn-dark">Invite a friend</h1>
      <p className="text-sm text-bark/70">
        When a friend signs up with your code, <b>you both get 100 points</b>. Points work like credit toward a top-up.
      </p>

      <div className="space-y-2 rounded-xl bg-sand p-4">
        <div className="text-sm text-bark/70">Your referral code</div>
        <div className="text-xl font-bold tracking-wider text-bark">{user.referralCode}</div>
        <div className="text-sm text-bark/70">Points: {balance.toLocaleString()}</div>
      </div>

      <CopyButton text={shareUrl} label="Copy share link" />

      {user.referredBy === undefined && (
        <div className="rounded-xl bg-sand p-4">
          <ReferralForm initialCode={cookieCode ?? ''} />
        </div>
      )}
    </section>
  );
}
