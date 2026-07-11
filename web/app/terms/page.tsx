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
        <p className="mt-2 text-[13px] text-bark/70">
          By using Dotori you agree to these terms. Please read them, especially the entertainment
          disclaimer below.
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed">
        <LegalSection title="1. Entertainment only — please read first">
          <p>
            Dotori generates saju (Korean fortune-telling) readings and compatibility scores for{' '}
            <strong>entertainment and self-reflection only</strong>. Our readings are{' '}
            <strong>not</strong> medical, legal, financial, psychological, or any other form of
            professional advice, and must never be treated as a substitute for a qualified
            professional.
          </p>
          <p className="mt-2">
            Nothing in a reading is a guarantee or prediction of any real-world outcome. Dotori does
            not make definitive claims about your health, lifespan or death, legal matters, or
            guaranteed financial results, and you should not make important life decisions based on a
            reading. Any resemblance between a reading and real events is coincidental.
          </p>
        </LegalSection>

        <LegalSection title="2. Who can use Dotori">
          <p>
            You must be at least 13 years old to use Dotori. If you are under 13, you may not create
            an account or use the service. By using Dotori you confirm that you meet this age
            requirement.
          </p>
        </LegalSection>

        <LegalSection title="3. Accounts, credits & readings">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Reading credits and oracle-question credits are tied to your account and are{' '}
              <strong>non-transferable</strong> — they cannot be shared, gifted, sold, or moved to
              another account.
            </li>
            <li>
              Purchased credits and the readings they unlock are for your personal use on the account
              that bought them.
            </li>
            <li>
              Saved readings are retained for <strong>30 days</strong> and are then automatically and
              permanently deleted. Please save anything you want to keep before it expires.
            </li>
            <li>
              You are responsible for keeping your account secure and for activity that happens under
              it.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Payments & refunds">
          <p>
            Paid readings and oracle questions are digital content delivered through your account. See
            our <Link href="/refund" className="underline">Refund Policy</Link> for when refunds apply
            and how to request one.
          </p>
        </LegalSection>

        <LegalSection title="5. Acceptable use">
          <p>You agree not to:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>abuse, harass, or disrupt the service or other users;</li>
            <li>resell, sublicense, or commercially redistribute access to Dotori or its readings;</li>
            <li>scrape, crawl, or bulk-download content, or use automated means to access the service;</li>
            <li>attempt to bypass the paywall, credit system, or any security or rate controls;</li>
            <li>use Dotori for any unlawful purpose or in violation of these terms.</li>
          </ul>
        </LegalSection>

        <LegalSection title="6. Changes & termination">
          <p>
            We may update, suspend, or discontinue any part of the service, and may revise these terms
            from time to time; material changes will be reflected on this page. We may suspend or
            terminate accounts that violate these terms or that we reasonably believe are being used
            fraudulently or abusively. You may stop using Dotori at any time.
          </p>
        </LegalSection>

        <LegalSection title="7. Governing law">
          <p>
            [OWNER: insert governing jurisdiction/state/country and courts]
          </p>
        </LegalSection>

        <LegalSection title="8. Business information">
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
