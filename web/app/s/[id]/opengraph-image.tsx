import { ImageResponse } from 'next/og';
import { getStore } from '../../../lib/services';
import {
  ELEMENT_ORDER,
  truncateForCard,
  type ShareCardPayload,
  type SoloCardPayload,
  type CompatCardPayload,
} from '../../../lib/share-cards';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Dotori — Your Korean fortune, one acorn at a time';

// Plain English + inline styling + emoji only. No bundled font or mascot image — satori's default
// font covers Latin text, so this renders without external assets.
const C = {
  cream: '#FBF6EC', sand: '#F3E9D8', card: '#FFFDF8',
  acorn: '#8A5A2B', acornDark: '#5C3B1E', caramel: '#C98A3C', bark: '#4A3728', blush: '#F2A9A0',
};
const ELEMENT_COLORS: Record<string, string> = {
  Wood: '#7FA35A', Fire: '#E2735F', Earth: '#C98A3C', Metal: '#A89F8D', Water: '#6E93B8',
};
// English lines run longer than the Korean originals — truncate before rendering so the longest
// character/teaser line can't overflow its container.
const LINE_MAX = 92;
// Host/guest names are user-entered (nicknames aren't length-capped upstream) — truncate so a long
// one can't overflow the fixed 1200x630 canvas.
const NAME_MAX = 24;

function SidePanel() {
  return (
    <div style={{
      width: 420, height: '100%', background: C.sand, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <div style={{ fontSize: 200 }}>🌰</div>
      <div style={{ color: C.acorn, fontSize: 34, fontWeight: 700 }}>Dotori</div>
    </div>
  );
}

function SoloCard({ p }: { p: SoloCardPayload }) {
  const max = Math.max(...ELEMENT_ORDER.map((n) => p.elements[n]), 1);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: C.card }}>
      <SidePanel />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 56px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: C.caramel, fontSize: 26, fontWeight: 700 }}>Your saju character</div>
          <div style={{ color: C.bark, fontSize: 60, fontWeight: 700, marginTop: 6 }}>{p.characterName}</div>
          <div style={{ color: C.acorn, fontSize: 30, marginTop: 8 }}>{p.stemLabel}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '90%' }}>
          {ELEMENT_ORDER.map((name) => {
            const v = p.elements[name];
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 72, color: ELEMENT_COLORS[name], fontSize: 22, fontWeight: 700 }}>{name}</div>
                <div style={{ flex: 1, height: 18, background: C.sand, borderRadius: 9, display: 'flex' }}>
                  <div style={{
                    width: `${Math.max(6, (v / max) * 100)}%`, height: '100%',
                    background: ELEMENT_COLORS[name], borderRadius: 9,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', color: C.bark, fontSize: 26, maxWidth: 540 }}>
            &ldquo;{truncateForCard(p.line, LINE_MAX)}&rdquo;
          </div>
          <div style={{ color: C.acorn, fontSize: 24, fontWeight: 700 }}>Try it too →</div>
        </div>
      </div>
    </div>
  );
}

function CompatCard({ p }: { p: CompatCardPayload }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: C.card }}>
      <SidePanel />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 56px' }}>
        <div style={{ color: C.caramel, fontSize: 26, fontWeight: 700 }}>Compatibility score</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', color: C.acorn, fontSize: 120, fontWeight: 700, lineHeight: 1 }}>
            {p.score}<span style={{ fontSize: 44 }}>/100</span>
          </div>
          <div style={{ background: C.acorn, color: C.cream, fontSize: 26, fontWeight: 700, padding: '8px 28px', borderRadius: 999 }}>
            {p.tier}
          </div>
          <div style={{ color: C.bark, fontSize: 32, fontWeight: 700, display: 'flex', gap: 12 }}>
            {truncateForCard(p.hostName ?? 'A friend', NAME_MAX)}{' '}
            <span style={{ color: C.blush }}>♥</span> {truncateForCard(p.guestNickname, NAME_MAX)}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', color: C.bark, fontSize: 26, maxWidth: 540 }}>
            &ldquo;{truncateForCard(p.line, LINE_MAX)}&rdquo;
          </div>
          <div style={{ color: C.acorn, fontSize: 24, fontWeight: 700 }}>Try it too →</div>
        </div>
      </div>
    </div>
  );
}

function FallbackCard() {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24, background: C.cream,
    }}>
      <div style={{ fontSize: 160 }}>🌰</div>
      <div style={{ color: C.acornDark, fontSize: 60, fontWeight: 700 }}>Dotori</div>
      <div style={{ color: C.bark, fontSize: 30 }}>Your Korean fortune, one acorn at a time.</div>
    </div>
  );
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getStore().getShareCard(id).catch(() => undefined);
  const valid = Boolean(card && card.expiresAt > Date.now());
  let payload: ShareCardPayload | undefined;
  if (valid && card) {
    try {
      const p = JSON.parse(card.payloadJson) as ShareCardPayload;
      if (p && (p.kind === 'solo' || p.kind === 'compat')) payload = p;
    } catch {
      payload = undefined; // malformed payload -> FallbackCard
    }
  }
  const ok = valid && payload !== undefined;

  const body = !payload ? (
    <FallbackCard />
  ) : payload.kind === 'solo' ? (
    <SoloCard p={payload} />
  ) : (
    <CompatCard p={payload} />
  );

  return new ImageResponse(body, {
    ...size,
    headers: {
      // Snapshot is immutable — long-cache valid cards, short-cache fallback/malformed.
      'Cache-Control': ok ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    },
  });
}
