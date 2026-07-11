import Link from 'next/link';
import { Card } from '../../../components/ui/Card';
import { buttonClass } from '../../../components/ui/Button';

export default function CheckoutCancelPage() {
  return (
    <section className="space-y-6 text-center">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Payment canceled</h1>
      <Card className="text-bark">
        <p>Your payment was canceled. You weren&apos;t charged.</p>
      </Card>
      <Link href="/checkout" className={buttonClass('primary')}>Try again</Link>
    </section>
  );
}
