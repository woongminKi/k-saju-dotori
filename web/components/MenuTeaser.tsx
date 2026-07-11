import Link from 'next/link';
import { buttonClass } from './ui/Button';

const TEASERS: Record<string, string> = {
  solo: 'Your whole saju — personality, money, love, career, and health, read from every angle.',
  'love-marriage': 'Your love style, marriage luck, and when the right person tends to show up.',
  career: 'The work that fits you, your natural talents, and the seasons when you shine.',
  couple: 'The two of you together — the spark, the friction, and how to make it last.',
};

export function MenuTeaser({ menu }: { menu: string }) {
  return (
    <div className="space-y-4 rounded-xl border border-line bg-sand p-6 shadow-soft">
      <p className="text-bark">{TEASERS[menu] ?? 'Unlock the full reading with one credit.'}</p>
      <p className="text-sm text-bark/70">
        One credit unlocks this reading — and you can revisit it free for 30 days.
      </p>
      <Link href="/checkout" className={buttonClass('primary', 'md', 'inline-block')}>
        Get credits
      </Link>
    </div>
  );
}
