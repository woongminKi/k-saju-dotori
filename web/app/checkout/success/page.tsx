import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '../../../components/ui/Card';
import { buttonClass } from '../../../components/ui/Button';
import { TrackOnMount } from '../../../components/TrackOnMount';

export const metadata: Metadata = { title: 'Payment Successful' };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ units?: string; product?: string }>;
}) {
  const { units, product } = await searchParams;
  const isOracle = product === 'oracle';
  const message = isOracle
    ? (units ? `${units} acorn draws added.` : 'Your acorn draws are ready.')
    : (units ? `${units} reading credits added.` : 'Your credits are ready.');
  return (
    <section className="space-y-6 text-center">
      <TrackOnMount
        event="checkout_success"
        props={{ product: isOracle ? 'oracle' : 'reading', units: Number(units) || 0 }}
      />
      <h1 className="text-2xl font-extrabold text-acorn-dark">You&apos;re topped up</h1>
      <Card className="text-bark">
        <p>{message}</p>
      </Card>
      <Link href="/" className={buttonClass('primary')}>Go home</Link>
    </section>
  );
}
