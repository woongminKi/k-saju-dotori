import type { MetadataRoute } from 'next';

const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';

// Login-only, in-checkout, and private paths — pointless to crawl or a PII-exposure risk.
// /menu/*, /s/[id] (share cards), and legal pages (/terms etc.) are public, so they stay crawlable.
const DISALLOW = ['/api/', '/checkout', '/library', '/login', '/invite'];

// Alongside the wildcard rule, explicitly allow AI search/training crawlers — some prefer a named
// block over the wildcard, so this keeps them allowed even if other blocks get added later.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'Google-Extended',
  'Gemini',
  'PerplexityBot',
  'Applebot-Extended',
  'cohere-ai',
  'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
