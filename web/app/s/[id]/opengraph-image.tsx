import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Dotori — Your Korean fortune, one acorn at a time';

// Phase-6 scope reduction: plain English + inline styling only. No og-assets.ts, no bundled font or
// mascot image — satori's default font covers Latin text, so this renders without external assets.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          background: '#FBF6EC',
        }}
      >
        <div style={{ fontSize: 160 }}>🌰</div>
        <div style={{ color: '#5C3B1E', fontSize: 72, fontWeight: 700 }}>Dotori</div>
        <div style={{ color: '#4A3728', fontSize: 34 }}>Your Korean fortune, one acorn at a time.</div>
      </div>
    ),
    { ...size, headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
