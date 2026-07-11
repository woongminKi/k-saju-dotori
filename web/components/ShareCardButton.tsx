'use client';
import { useState } from 'react';
import { buttonClass } from './ui/Button';
import { createShareCardAction, type ShareCardInput } from '../app/s/actions';
import { track } from '@vercel/analytics';

/** Creates a share card -> Web Share (falls back to clipboard). Failures never break the result view.
 *  The card's rich per-user content lives in the /s/[id] page + OG image; title/text here are the
 *  short share-sheet copy passed by the calling page. */
export function ShareCardButton({
  input, title, text, label, fullWidth = true,
}: {
  input: ShareCardInput;
  title: string;
  text: string;
  label: string;
  /** Defaults to true (full-width, for form-style pages). Set false to match content-width sibling buttons. */
  fullWidth?: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'copied' | 'error' | 'manual'>('idle');
  const [url, setUrl] = useState<string>('');

  return (
    <div className={fullWidth ? 'space-y-2' : 'space-y-2 text-center'}>
      <button
        type="button"
        disabled={status === 'busy'}
        className={buttonClass('secondary', 'md', fullWidth ? 'w-full' : 'inline-block')}
        onClick={async () => {
          setStatus('busy');
          const res = await createShareCardAction(input);
          if (!res.ok) {
            setStatus('error');
            return;
          }
          track('share_card_create', { kind: input.kind });

          if (typeof navigator.share === 'function') {
            try {
              await navigator.share({ title, text, url: res.url });
              setStatus('idle');
            } catch {
              // Share sheet cancelled (AbortError) etc. — swallow quietly.
              setStatus('idle');
            }
          } else {
            try {
              await navigator.clipboard.writeText(res.url);
              setStatus('copied');
            } catch {
              // Clipboard failed — surface the link to the user.
              setUrl(res.url);
              setStatus('manual');
            }
          }
        }}
      >
        {label}
      </button>
      {status === 'copied' && <p className="text-center text-xs text-bark/70">Link copied!</p>}
      {status === 'error' && (
        <p className="text-center text-xs text-red-600">We couldn&apos;t make that card. Try again in a moment.</p>
      )}
      {status === 'manual' && url && (
        <p className="break-all text-center text-xs text-bark/70">
          Couldn&apos;t copy automatically. Copy this link: <span className="text-acorn">{url}</span>
        </p>
      )}
    </div>
  );
}
