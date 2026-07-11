'use client';
import { useEffect, useState } from 'react';
import { buttonClass } from './ui/Button';

// navigator.share support is only decided after mount (avoids an SSR hydration mismatch).
// When unsupported (most desktop/SSR), it renders nothing and the parent's CopyButton is the fallback.
export function ShareButton({
  url,
  title,
  text,
}: {
  url: string;
  title: string;
  text: string;
}) {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  if (!canShare) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.share({ title, text, url });
        } catch {
          // User cancelling the share sheet throws AbortError — swallow it (and any other error)
          // so the UI never breaks.
        }
      }}
      className={buttonClass('primary', 'md', 'w-full')}
    >
      Share with a friend
    </button>
  );
}
