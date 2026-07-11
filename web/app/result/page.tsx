import { Suspense } from 'react';
import { decodeBirth } from '../../lib/birth-params';
import type { BirthFields } from '../../lib/birth-params';
import { computeSummary } from '../../lib/engine';
import { MenuGrid } from '../../components/MenuGrid';
import { buttonClass } from '../../components/ui/Button';
import Link from 'next/link';
import { ShareCardButton } from '../../components/ShareCardButton';
import { TrackLink } from '../../components/TrackLink';

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      v === undefined ? [] : Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : [[k, v] as [string, string]],
    ),
  );

  let fields;
  try {
    fields = decodeBirth(params);
  } catch (e) {
    return (
      <section className="space-y-4">
        <p className="text-red-600">{e instanceof Error ? e.message : 'Your input was invalid.'}</p>
        <Link href="/input" className="text-acorn hover:underline">Back to the form</Link>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-sand">
        <span aria-hidden="true" className="text-6xl">🐿️</span>
      </div>
      <h1 className="text-2xl font-extrabold text-acorn-dark">Your fortune preview</h1>

      <div className="rounded-2xl border border-line bg-card p-6 shadow-soft">
        <span className="inline-block rounded-full bg-sand px-3 py-1 text-xs font-semibold text-acorn-dark">Preview</span>
        <Suspense
          fallback={
            <div className="mt-4 animate-pulse space-y-2" aria-label="Generating preview">
              <div className="h-4 rounded bg-sand" />
              <div className="h-4 rounded bg-sand" />
              <div className="h-4 w-2/3 rounded bg-sand" />
            </div>
          }
        >
          <TeaserBody fields={fields} retryHref={`/result?${params.toString()}`} />
        </Suspense>
      </div>

      <div className="space-y-4 text-center">
        <p className="text-sm text-bark/70">
          The full reading digs into your day master, five elements, and what to lean into.
        </p>
        <TrackLink
          href={`/menu/solo?${params.toString()}`}
          event="full_reading_cta"
          className={buttonClass('primary', 'md', 'inline-block')}
        >
          See my full reading (1 credit)
        </TrackLink>
        <ShareCardButton
          input={{ kind: 'solo', query: params.toString() }}
          title="Dotori"
          text="I just got my Korean fortune read on Dotori — you should try it 🐿️"
          label="Share my fortune 🐿️"
          fullWidth={false}
        />
        <Link href="/menu/compat/room/new" className={buttonClass('secondary', 'md', 'inline-block')}>
          Make a compatibility room with friends 🐿️
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-acorn-dark">Go deeper</h2>
        <MenuGrid query={params.toString()} />
      </div>
    </section>
  );
}

/** Teaser body — one LLM call inside Suspense. On failure, show a retry inside the card only. */
async function TeaserBody({ fields, retryHref }: { fields: BirthFields; retryHref: string }) {
  let teaser: string;
  try {
    teaser = await computeSummary(fields);
  } catch {
    // LLM not configured / outage / timeout etc. -> friendly notice instead of a raw 500. Free
    // teaser, so no charge — just a retry.
    return (
      <p className="mt-4 text-sm text-red-600">
        We couldn&apos;t generate your preview. Please{' '}
        <Link href={retryHref} className="text-acorn hover:underline">try again</Link>
        {' '}in a moment.
      </p>
    );
  }
  return <p className="mt-4 whitespace-pre-line leading-relaxed text-bark">{teaser}</p>;
}
