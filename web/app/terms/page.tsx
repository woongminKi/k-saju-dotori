import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalSection } from '../../components/LegalSection';
import { BUSINESS_INFO } from '../../lib/business-info';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-acorn-dark">Terms of Service</h1>
        <p className="mt-2 rounded-lg border border-blush/50 bg-blush/10 px-4 py-2 text-sm font-semibold text-bark">
          TODO(P7): Placeholder copy. Real legal terms land in a later phase.
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed">
        <LegalSection title="1. About these terms">
          <p>
            These placeholder Terms describe how you use Dotori, an entertainment saju (Korean fortune)
            reading service. Final terms, reviewed by counsel, will replace this page before launch.
          </p>
        </LegalSection>

        <LegalSection title="2. The service">
          <p>
            Dotori generates fortune-style readings and compatibility scores from the birth details you
            provide. Readings are for reference and entertainment only and are not professional advice.
          </p>
        </LegalSection>

        <LegalSection title="3. Payments & refunds">
          <p>
            Paid readings are digital content delivered instantly. See our{' '}
            <Link href="/refund" className="underline">Refund Policy</Link> for details.
          </p>
        </LegalSection>

        <LegalSection title="4. Business information">
          <ul className="list-disc space-y-1 pl-5">
            <li>Name: {BUSINESS_INFO.name}</li>
            <li>Owner: {BUSINESS_INFO.ceo}</li>
            <li>Registration no.: {BUSINESS_INFO.registrationNumber}</li>
            <li>Address: {BUSINESS_INFO.address}</li>
            <li>Country: {BUSINESS_INFO.country}</li>
            <li>Email: {BUSINESS_INFO.email}</li>
          </ul>
        </LegalSection>
      </div>
    </article>
  );
}
