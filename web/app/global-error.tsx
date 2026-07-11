'use client';

import { useEffect } from 'react';

/**
 * Root-level error boundary. Triggered when the root layout itself fails, so per Next's contract it
 * replaces the whole document and must render its own <html>/<body>. That also means globals.css /
 * Tailwind aren't loaded here — styles are inlined with the brand palette so it never degrades to a
 * bare white screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[CLIENT_ERROR:global]', {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: '#FBF6EC',
          color: '#4A3728',
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <main style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#5C3B1E', margin: '0 0 1rem' }}>
            Dotori tripped over an acorn
          </h1>
          <p style={{ margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            Something went sideways on our end. Take a breath, then give it another go — we&apos;ll
            have the acorns back in order.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.75rem',
              border: 'none',
              padding: '0.75rem 1.25rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: '#8A5A2B',
              color: '#FBF6EC',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
