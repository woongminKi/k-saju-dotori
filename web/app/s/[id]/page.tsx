import type { Metadata } from 'next';
import Link from 'next/link';
import { getStore } from '../../../lib/services';
import { ShareCardView } from '../../../components/ShareCardView';
import { buttonClass } from '../../../components/ui/Button';
import type { ShareCardPayload } from '../../../lib/share-cards';

export const dynamic = 'force-dynamic';

const DEFAULT_METADATA: Metadata = {
  title: 'Dotori',
  description: 'Pop in your birthday and get your Korean fortune read — no sign-up needed.',
  twitter: { card: 'summary_large_image' },
};

async function loadPayload(id: string): Promise<ShareCardPayload | null> {
  const card = await getStore().getShareCard(id).catch(() => undefined);
  if (!card || card.expiresAt <= Date.now()) return null;
  try {
    const p = JSON.parse(card.payloadJson) as ShareCardPayload;
    return p && (p.kind === 'solo' || p.kind === 'compat') ? p : null;
  } catch {
    return null;
  }
}

// Per-card title/description from the real payload; falls back to generic brand metadata when
// there's no valid card (expired/missing/malformed).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const payload = await loadPayload(id);
  if (!payload) return DEFAULT_METADATA;
  const description =
    payload.kind === 'solo'
      ? `${payload.characterName} — get your Korean fortune read on Dotori`
      : `${payload.hostName ?? 'A friend'} ♥ ${payload.guestNickname} — see their compatibility score on Dotori`;
  return { title: 'Dotori', description, twitter: { card: 'summary_large_image' } };
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

  return <ShareCardView payloadJson={card.payloadJson} cta={cta} />;
}
