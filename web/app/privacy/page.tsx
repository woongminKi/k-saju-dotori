import type { Metadata } from 'next';
import { LegalSection } from '../../components/LegalSection';
import { BUSINESS_INFO } from '../../lib/business-info';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-acorn-dark">Privacy Policy</h1>
        <p className="mt-2 text-[13px] text-bark/70">
          This policy explains what Dotori collects, why, how long we keep it, and your rights.
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed">
        <LegalSection title="1. What we collect">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Birth details</strong> — your birth date, birth time, birth place, and gender.
              This data is <strong>encrypted at rest</strong> and is never shown to other users.
            </li>
            <li>
              <strong>Google account identifier</strong> — when you sign in with Google, we receive a
              Google account identifier to create and recognize your account.
            </li>
            <li>
              <strong>Order &amp; payment records</strong> — records of the credits and readings you
              purchase. We do <strong>not</strong> store raw card numbers; card processing is handled
              by our payment provider.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="2. Why we collect it">
          <p>We use this information to:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>generate your readings from the birth details you provide;</li>
            <li>save your reading history to your account so you can revisit it;</li>
            <li>process payments and maintain your credit balance.</li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Retention">
          <p>
            Saved readings are automatically deleted 30 days after they are created. Your account and
            payment/ledger records are kept longer than that for accounting, tax, and
            fraud-prevention purposes, and are retained only as long as reasonably necessary for those
            purposes.
          </p>
        </LegalSection>

        <LegalSection title="4. We do not sell your data">
          <p>
            <strong>We do not sell your personal data.</strong> We do not currently send marketing
            emails and do not use your data for advertising.
          </p>
        </LegalSection>

        <LegalSection title="5. Subprocessors">
          <p>We rely on the following service providers to operate Dotori:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li><strong>Supabase</strong> — database and authentication hosting.</li>
            <li><strong>Vercel</strong> — application hosting.</li>
            <li><strong>Anthropic</strong> — AI generation of your readings.</li>
          </ul>
          <p className="mt-2">
            A payment processor will be added as a subprocessor when real payments launch.
          </p>
        </LegalSection>

        <LegalSection title="6. EU/UK visitors (GDPR)">
          <p>
            If you are in the EU or UK, we process your personal data on the following lawful bases:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>Performance of a contract</strong> — to generate and deliver the readings you
              request and to maintain your account and credits.
            </li>
            <li>
              <strong>Consent</strong> — where applicable (for example, marketing). We do not
              currently run any marketing communications, so no such consent is collected at this
              time.
            </li>
          </ul>
          <p className="mt-2">
            You have the right to access, rectify, erase, and port your data, and to object to certain
            processing. To exercise any of these rights, email {BUSINESS_INFO.email}.
          </p>
          <p className="mt-2">
            [OWNER: confirm data protection officer / EU representative contact if required by DPA
            obligations]
          </p>
        </LegalSection>

        <LegalSection title="7. Contact">
          <p>Questions about your data or this policy? Email {BUSINESS_INFO.email}.</p>
        </LegalSection>
      </div>
    </article>
  );
}
