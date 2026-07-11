'use client';
import { useEffect, useState } from 'react';

const MESSAGES = [
  'Now where did I bury that acorn...',
  'Your fortune acorn is around here somewhere...',
  'Ooh, I think I feel it...!',
];

export function LoadingRotator() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-6 overflow-hidden text-center" aria-live="polite">
      <p key={i} className="animate-loading-rise text-sm font-medium text-bark/70">
        {MESSAGES[i]}
      </p>
    </div>
  );
}
