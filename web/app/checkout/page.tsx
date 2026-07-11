import type { Metadata } from 'next';
import Link from 'next/link';
import { getAuth, getStore } from '../../lib/services';
import { pointsBalance } from '../../lib/points';
import { buttonClass } from '../../components/ui/Button';
import { CheckoutForm } from './CheckoutForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Get Credits' };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  const defaultProduct = product === 'oracle' ? 'oracle' : 'reading';
  const user = await getAuth().getCurrentUser();
  const balance = user ? await pointsBalance(getStore(), user.id) : 0;

  return (
    <section className="space-y-6">
      <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-sand">
        <span aria-hidden="true" className="text-5xl">🌰</span>
      </div>
      <h1 className="text-2xl font-extrabold text-acorn-dark">Get credits</h1>
      <p className="text-sm text-bark/70">Top up reading credits (1 credit = 1 reading) or acorn-oracle credits.</p>
      {!user ? (
        <div className="space-y-2">
          <p className="text-sm text-bark/70">Log in to get credits.</p>
          <Link href="/login" className={buttonClass('ghost', 'sm')}>Log in</Link>
        </div>
      ) : (
        <CheckoutForm pointsBalance={balance} defaultProduct={defaultProduct} />
      )}
    </section>
  );
}
