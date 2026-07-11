import type { Metadata } from 'next';
import { CouplePairForm } from '../../../components/CouplePairForm';

export const metadata: Metadata = {
  title: 'Couple Compatibility — how well do you two fit?',
  description: 'Enter both birthdays and get your AI saju compatibility score and reading right away.',
};

export default function CoupleInputPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Couple compatibility</h1>
      <CouplePairForm resultPath="/menu/couple/result" submitLabel="See our compatibility" />
    </section>
  );
}
