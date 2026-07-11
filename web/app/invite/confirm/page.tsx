import Link from 'next/link';
import { getAuth } from '../../../lib/services';
import { readRefCookie } from '../../../lib/ref-cookie';
import { buttonClass } from '../../../components/ui/Button';
import { ReferralForm } from '../ReferralForm';

export const dynamic = 'force-dynamic';

export default async function ConfirmPage() {
  const user = await getAuth().getCurrentUser();
  const code = await readRefCookie();

  if (!user || user.referredBy !== undefined || !code) {
    return (
      <section className="space-y-4">
        <p className="text-bark/70">No referral to confirm.</p>
        <Link href="/" className={buttonClass('ghost', 'sm')}>Go home</Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Confirm your referral</h1>
      <p className="text-sm text-bark/70">
        Apply this code and <b>you both get 100 points</b>.
      </p>
      <div className="rounded-xl bg-sand p-4">
        <ReferralForm initialCode={code} />
      </div>
      <Link href="/" className="block text-center text-sm text-bark/70 underline">
        Skip
      </Link>
    </section>
  );
}
