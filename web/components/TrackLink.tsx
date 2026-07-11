'use client';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import type { ReactNode } from 'react';

/** A Link that fires a custom event on click. track() handles its own failures — navigation is unaffected. */
export function TrackLink({
  href, event, props, className, children,
}: {
  href: string;
  event: string;
  props?: Record<string, string | number>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => track(event, props)}>
      {children}
    </Link>
  );
}
