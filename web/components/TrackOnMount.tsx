'use client';
import { useEffect, useRef } from 'react';
import { track } from '@vercel/analytics';

/** Fires a custom event once on mount (page-reach analytics). Renders nothing.
 *  The fire is deferred one tick so the parent <Analytics/> effect initializes first.
 *  The `fired` guard is checked inside the timer callback (actual fire time), not at schedule
 *  time — so StrictMode's mount→unmount→remount cancels the first timer without tripping the
 *  guard, and only the remount's timer survives to fire exactly once. */
export function TrackOnMount({
  event, props,
}: {
  event: string;
  props?: Record<string, string | number>;
}) {
  const fired = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => {
      if (fired.current) return;
      fired.current = true;
      track(event, props);
    }, 0);
    return () => clearTimeout(id);
  }, [event, props]);
  return null;
}
