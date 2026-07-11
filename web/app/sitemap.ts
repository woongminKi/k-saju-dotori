import type { MetadataRoute } from 'next';
import { MENUS, STANDALONE_SLUGS } from '../components/MenuGrid';

const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/input`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/refund`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    // /login is Disallowed in robots.ts, so it's excluded here too (avoid mixed crawl signals).
  ];

  // Standalone menu slugs (render without a birth query) + oracle (its own entry page).
  // love-marriage/career (/menu/[slug]) require a birth query and error without one, so they're
  // excluded — solo too, for the same reason. Deduped in case a slug appears in both sources.
  const standaloneMenuSlugs = Array.from(
    new Set([...MENUS.filter((m) => STANDALONE_SLUGS.has(m.slug)).map((m) => m.slug), 'oracle']),
  );
  const menuPages: MetadataRoute.Sitemap = standaloneMenuSlugs.map((slug) => ({
    url: `${SITE_URL}/menu/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticPages, ...menuPages];
}
