import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { decodeBirth, normalizeBirthFields } from '../../../lib/birth-params';
import { computeLoveMarriageMenu, computeCareerMenu, startSoloMenu } from '../../../lib/engine';
import { getAuth, getStore } from '../../../lib/services';
import { resolveReading, resolveReadingStreaming } from '../../../lib/reading-flow';
import type { FinalizeOutcome } from '../../../lib/reading-flow';
import type { StartedMenuSection } from '@engine/menus/solo';
import { MenuResultView } from '../../../components/MenuResultView';
import { MenuTeaser } from '../../../components/MenuTeaser';
import { RateLimitNotice } from '../../../components/RateLimitNotice';
import { AwaitedSection, SectionSkeleton, FinalizeNotice } from '../../../components/StreamingReading';
import { ShareCardButton } from '../../../components/ShareCardButton';
import { buttonClass } from '../../../components/ui/Button';

const TITLES: Record<string, string> = {
  solo: 'Your full saju reading',
  'love-marriage': 'Love & Marriage',
  career: 'Career & Calling',
};

const DESCRIPTIONS: Record<string, string> = {
  solo: 'A full read of your saju — day master, five elements, and what to lean into, all in one place.',
  'love-marriage': 'Your love and marriage luck from your birth chart — relationship style and when connection gets stronger.',
  career: 'Your career and calling from your birth chart — the work that fits you and how your fortunes flow.',
};

// This route shows an error screen without a birth query string (it's a personalized result page),
// so it's marked no-index — sitemap.ts excludes these slugs for the same reason.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = TITLES[slug];
  if (!title) return {};
  return {
    title,
    description: DESCRIPTIONS[slug],
    robots: { index: false, follow: true },
  };
}

function toParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  return new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      v === undefined ? [] : Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : [[k, v] as [string, string]],
    ),
  );
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  if (slug !== 'solo' && slug !== 'love-marriage' && slug !== 'career') notFound();

  const qp = toParams(sp);
  let fields;
  try {
    fields = decodeBirth(qp);
  } catch (e) {
    return (
      <section className="space-y-4">
        <p className="text-red-600">{e instanceof Error ? e.message : 'Invalid input'}</p>
        <Link href="/input" className="text-acorn hover:underline">Back to the form</Link>
      </section>
    );
  }

  const user = await getAuth().getCurrentUser();
  if (!user) {
    return (
      <section className="space-y-4">
        <p className="text-bark">Please log in first.</p>
        <Link href="/" className="text-acorn hover:underline">Go home</Link>
      </section>
    );
  }

  // solo (6 modules, the longest wait) streams — showing each module as it finishes.
  if (slug === 'solo') {
    const outcome = await resolveReadingStreaming({
      store: getStore(),
      userId: user.id,
      menu: slug,
      normalizedInput: normalizeBirthFields(fields),
      startUnlocked: () => startSoloMenu(fields),
    });

    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-extrabold text-acorn-dark">{TITLES[slug]}</h1>
        {outcome.kind === 'insufficient' ? (
          <MenuTeaser menu={slug} />
        ) : outcome.kind === 'rateLimited' ? (
          <RateLimitNotice />
        ) : outcome.kind === 'reused' ? (
          <MenuResultView result={outcome.result} />
        ) : (
          <StreamingSolo sections={outcome.sections} finalize={outcome.finalize} />
        )}
        {outcome.kind !== 'insufficient' && outcome.kind !== 'rateLimited' && (
          <>
            <ShareCardButton
              input={{ kind: 'solo', query: qp.toString() }}
              title="Dotori"
              text="I just got my Korean fortune read on Dotori — you should try it 🐿️"
              label="Share my fortune 🐿️"
              fullWidth={false}
            />
            <div className="text-center">
              <Link href="/menu/compat/room/new" className={buttonClass('secondary', 'md', 'inline-block')}>
                Make a compatibility room with friends 🐿️
              </Link>
            </div>
          </>
        )}
      </section>
    );
  }

  const outcome = await resolveReading({
    store: getStore(),
    userId: user.id,
    menu: slug,
    normalizedInput: normalizeBirthFields(fields),
    computeUnlocked: () =>
      slug === 'career'
        ? computeCareerMenu(fields, { unlocked: true })
        : computeLoveMarriageMenu(fields, { unlocked: true }),
  });

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-extrabold text-acorn-dark">{TITLES[slug]}</h1>
      {outcome.kind === 'insufficient' ? (
        <MenuTeaser menu={slug} />
      ) : outcome.kind === 'rateLimited' ? (
        <RateLimitNotice />
      ) : outcome.kind === 'failed' ? (
        <p className="text-sm text-amber-600">The reading didn&apos;t generate. You weren&apos;t charged — try again in a moment.</p>
      ) : (
        <MenuResultView result={outcome.result} />
      )}
    </section>
  );
}

function StreamingSolo({
  sections,
  finalize,
}: {
  sections: StartedMenuSection[];
  finalize: () => Promise<FinalizeOutcome>;
}) {
  const overall = sections.find((s) => s.id === 'overall');
  const details = sections.filter((s) => s.id !== 'overall');

  return (
    <div className="space-y-4">
      {overall && (
        <Suspense fallback={<SectionSkeleton title={overall.title} badge="Summary" />}>
          <AwaitedSection section={overall.section} badge="Summary" />
        </Suspense>
      )}
      {details.map((s) => (
        <Suspense key={s.id} fallback={<SectionSkeleton title={s.title} />}>
          <AwaitedSection section={s.section} />
        </Suspense>
      ))}
      <Suspense fallback={null}>
        <FinalizeNotice finalize={finalize} />
      </Suspense>
    </div>
  );
}
