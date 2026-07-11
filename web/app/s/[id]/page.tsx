import type { Metadata } from 'next';
import Link from 'next/link';
import { getStore } from '../../../lib/services';
import { ShareCardView } from '../../../components/ShareCardView';
import { buttonClass } from '../../../components/ui/Button';

export const dynamic = 'force-dynamic';

// Phase-6 scope reduction: no per-card character/tier copy (engine content is Korean-only for now),
// so metadata + body are generic and brand-honest. No og-assets.ts import.
const DEFAULT_METADATA: Metadata = {
  title: 'Dotori',
  description: 'Pop in your birthday and get your Korean fortune read — no sign-up needed.',
  twitter: { card: 'summary_large_image' },
};

export function generateMetadata(): Metadata {
  return DEFAULT_METADATA;
}

// Public share snapshot — anonymous. Expired/missing cards fall back to a friendly notice + home CTA.
export default async function ShareCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const card = await store.getShareCard(id).catch(() => undefined);

  if (!card || card.expiresAt <= Date.now()) {
    return (
      <section className="space-y-4 text-center">
        <p className="text-bark/70">This card has expired 🐿️</p>
        <Link href="/" className={buttonClass('primary', 'md', 'inline-block')}>
          Read my fortune
        </Link>
      </section>
    );
  }

  const cta =
    card.kind === 'compat' && card.roomId
      ? { href: `/menu/compat/room/${card.roomId}/join`, label: 'Check your compatibility too' }
      : { href: '/', label: 'Get your own reading →' };

  return <ShareCardView cta={cta} />;
}
