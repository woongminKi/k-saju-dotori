import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { BUSINESS_INFO } from '../lib/business-info';
import { CREDIT_PACKAGES, ORACLE_PACKAGES } from '../lib/pricing';

const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';
const SITE_NAME = 'Dotori';
const TAGLINE = 'Your Korean fortune, one acorn at a time.';
const SITE_DESCRIPTION =
  'Pop in your birthday and let Dotori read your Korean saju — your personality, love life, career, and the year ahead. Your Korean fortune, one acorn at a time.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Dotori — Your Korean fortune, one acorn at a time',
    template: '%s | Dotori',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'korean fortune', 'saju', 'saju reading', 'fortune telling', 'compatibility',
    'love reading', 'birth chart', 'AI fortune', 'daily fortune', 'zodiac',
  ],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    siteName: SITE_NAME,
    title: 'Dotori — Your Korean fortune, one acorn at a time',
    description: 'Pop in your birthday and get your Korean saju read. Free compatibility score too!',
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: TAGLINE,
  },
};

// The header reads per-request login state (cookies), so skip static prerender — render per request.
export const dynamic = 'force-dynamic';

/** JSON-LD structured data — Organization/WebSite/WebApplication bundled into a single @graph.
 *  Business details come from business-info.ts (single source); the price range reads the
 *  pricing.ts package list (USD, cents-based). */
function buildJsonLd() {
  const allAmounts = [...CREDIT_PACKAGES, ...ORACLE_PACKAGES].map((p) => p.amountCents / 100);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: BUSINESS_INFO.name,
        url: SITE_URL,
        email: BUSINESS_INFO.email,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: 'en-US',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        inLanguage: 'en-US',
        description: SITE_DESCRIPTION,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: Math.min(...allAmounts),
          highPrice: Math.max(...allAmounts),
          offerCount: CREDIT_PACKAGES.length + ORACLE_PACKAGES.length,
        },
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd()) }}
        />
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
