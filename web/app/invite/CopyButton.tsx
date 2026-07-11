'use client';
import { useState } from 'react';

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="w-full rounded-lg border border-line bg-card p-3 text-sm text-bark shadow-soft transition hover:bg-sand"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
