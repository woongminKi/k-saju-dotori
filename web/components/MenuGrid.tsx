import Link from 'next/link';

// sitemap.ts references this list too (single source) — add/change slugs & labels here only.
export const MENUS: { slug: string; label: string }[] = [
  { slug: 'love-marriage', label: 'Love & Marriage' },
  { slug: 'career', label: 'Career & Calling' },
  { slug: 'couple', label: 'Couple Compatibility' },
  { slug: 'compat', label: 'Quick Compatibility Score' },
];

/** Slugs that render standalone (with their own birth-input form) rather than needing a birth
 *  query string. love-marriage/career are single-person paid menus that /menu/[slug] renders from
 *  birth query params, so they're excluded here (visiting them without params errors). */
export const STANDALONE_SLUGS = new Set(['couple', 'compat']);

export function MenuGrid({ query }: { query: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {MENUS.map((m) => (
        <Link
          key={m.slug}
          href={STANDALONE_SLUGS.has(m.slug) ? `/menu/${m.slug}` : `/menu/${m.slug}?${query}`}
          className="rounded-xl border border-line bg-card p-4 text-center text-bark shadow-soft transition hover:bg-sand"
        >
          {m.label}
        </Link>
      ))}
    </div>
  );
}
