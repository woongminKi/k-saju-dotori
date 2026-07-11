import { RATE_LIMIT_MESSAGE } from '../lib/rate-limit';

/** In-voice notice shown when a server-rendered page/action is rate limited (RSC can't set a 429). */
export function RateLimitNotice() {
  return <p className="text-sm text-amber-600">{RATE_LIMIT_MESSAGE}</p>;
}
