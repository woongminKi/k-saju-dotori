import type { Metadata } from 'next';
import { LegalSection } from '../../components/LegalSection';
import { BUSINESS_INFO } from '../../lib/business-info';

export const metadata: Metadata = { title: 'Refund Policy' };

export default function RefundPage() {
  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-acorn-dark">Refund Policy</h1>
        <p className="mt-2 rounded-lg border border-blush/50 bg-blush/10 px-4 py-2 text-sm font-semibold text-bark">
          TODO(P7): Placeholder copy. The final refund policy lands in a later phase.
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed">
        <p className="text-bark">
          Dotori sells digital content that&apos;s delivered instantly. The placeholder guidelines below
          describe our intended approach; the final policy will replace this page.
        </p>

        <LegalSection title="1. When a refund applies">
          <ul className="list-disc space-y-1 pl-5">
            <li>A credit was charged but the reading failed to generate — full refund or credit restored.</li>
            <li>A system error stopped you from receiving your result — full refund or credit restored.</li>
            <li>Credits bought but never used — full refund.</li>
          </ul>
          <p className="mt-2 text-[13px] text-bark/70">
            If generation fails entirely, no credit is charged in the first place.
          </p>
        </LegalSection>

        <LegalSection title="2. When it doesn&apos;t">
          <ul className="list-disc space-y-1 pl-5">
            <li>The reading was generated and delivered (digital content already provided).</li>
            <li>Incorrect birth details were entered by the user.</li>
            <li>Dissatisfaction with the interpretation itself — readings are for entertainment.</li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Contact">
          <ul className="list-disc space-y-1 pl-5">
            <li>Email: {BUSINESS_INFO.email}</li>
            <li>Hours: {BUSINESS_INFO.businessHours}</li>
          </ul>
        </LegalSection>
      </div>
    </article>
  );
}
