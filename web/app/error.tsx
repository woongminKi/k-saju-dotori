'use client';

import { useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { buttonClass } from '../components/ui/Button';

/**
 * Per-route-segment error boundary (Next App Router contract: client component, { error, reset }).
 * On mount we log a structured line client-side so it lands in the browser console / Vercel client
 * logs; server-side errors are separately captured by instrumentation.ts's onRequestError.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[CLIENT_ERROR]', {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <section className="space-y-6 text-center">
      <h1 className="text-2xl font-extrabold text-acorn-dark">The acorns dropped something</h1>
      <Card className="text-bark">
        <p>
          Dotori fumbled that one — a little hiccup on our end, not you. Give it another try and the
          acorns should behave.
        </p>
      </Card>
      <button type="button" onClick={() => reset()} className={buttonClass('primary')}>
        Try again
      </button>
    </section>
  );
}
