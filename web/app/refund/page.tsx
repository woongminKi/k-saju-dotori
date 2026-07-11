import type { Metadata } from 'next';
import { LegalSection } from '../../components/LegalSection';
import { BUSINESS_INFO } from '../../lib/business-info';

export const metadata: Metadata = { title: 'Refund Policy' };

export default function RefundPage() {
  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-acorn-dark">Refund Policy</h1>
        <p className="mt-2 text-[13px] text-bark/70">
          Dotori sells digital content — reading credits and oracle-question credits — that is
          delivered instantly through your account. This policy explains when refunds apply.
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed">
        <LegalSection title="1. Unused credits">
          <p>
            Purchased but unused reading credits and oracle credits are refundable on request within{' '}
            <strong>14 days</strong> of purchase, in line with EU distance selling rules for digital
            goods. Contact us with your order reference and we will refund the unused credits.
          </p>
        </LegalSection>

        <LegalSection title="2. Delivered readings">
          <p>
            Once a reading has been generated and delivered, it is non-refundable, because the service
            has already been rendered. Spending a credit to unlock a reading is a request for
            immediate delivery of digital content.
          </p>
        </LegalSection>

        <LegalSection title="3. Failed generations">
          <p>
            You are never charged for a reading you did not receive. If a reading fails to generate,
            no credit is deducted; and in the rare case a credit is charged but no result is delivered
            to you, the charge is reversed automatically. If you believe a credit was taken without a
            delivered reading, contact us and we will restore it.
          </p>
        </LegalSection>

        <LegalSection title="4. When a refund doesn&apos;t apply">
          <ul className="list-disc space-y-1 pl-5">
            <li>The reading was generated and delivered (digital content already provided).</li>
            <li>Incorrect birth details were entered by the user.</li>
            <li>Dissatisfaction with the interpretation itself — readings are for entertainment only.</li>
          </ul>
        </LegalSection>

        <LegalSection title="5. How to request a refund">
          <p>
            Email {BUSINESS_INFO.email} with your order or reading reference and we will get back to
            you.
          </p>
          <p className="mt-2 text-[13px] text-bark/70">Support hours: {BUSINESS_INFO.businessHours}</p>
        </LegalSection>
      </div>
    </article>
  );
}
