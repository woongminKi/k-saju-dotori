import type { Metadata } from 'next';
import { LegalSection } from '../../components/LegalSection';
import { BUSINESS_INFO } from '../../lib/business-info';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-acorn-dark">Privacy Policy</h1>
        <p className="mt-2 rounded-lg border border-blush/50 bg-blush/10 px-4 py-2 text-sm font-semibold text-bark">
          TODO(P7): Placeholder copy. The full privacy policy lands in a later phase.
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed">
        <LegalSection title="1. What we collect">
          <p>
            To generate a reading, Dotori uses the birth details you enter (date, optional time, place,
            and gender). Birth details are encrypted at rest and are not shown to other users.
          </p>
        </LegalSection>

        <LegalSection title="2. How we use it">
          <p>
            Your details are used only to compute your reading and to save it to your account so you can
            revisit it. We do not sell your personal data.
          </p>
        </LegalSection>

        <LegalSection title="3. Retention">
          <p>Saved readings expire automatically after 30 days.</p>
        </LegalSection>

        <LegalSection title="4. Contact">
          <p>Questions about your data? Email {BUSINESS_INFO.email}.</p>
        </LegalSection>
      </div>
    </article>
  );
}
