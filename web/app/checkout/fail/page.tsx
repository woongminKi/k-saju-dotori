import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '../../../components/ui/Card';
import { buttonClass } from '../../../components/ui/Button';

export const metadata: Metadata = { title: 'Payment Failed' };

export default function CheckoutFailPage() {
  return (
    <section className="space-y-6 text-center">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Payment failed</h1>
      <Card className="text-bark">
        <p>Your payment didn&apos;t go through. You weren&apos;t charged — please try again.</p>
      </Card>
      <Link href="/checkout" className={buttonClass('primary')}>Try again</Link>
    </section>
  );
}
