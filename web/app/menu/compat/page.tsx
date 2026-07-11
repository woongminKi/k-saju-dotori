import Link from 'next/link';
import type { Metadata } from 'next';
import { CouplePairForm } from '../../../components/CouplePairForm';
import { buttonClass } from '../../../components/ui/Button';

export const metadata: Metadata = {
  title: 'Free compatibility score',
  description: 'Enter two birthdays and get your AI compatibility score free. Or share an invite link and check compatibility with a whole group at once.',
};

export default function CompatInputPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Compatibility score</h1>
      <p className="text-sm text-bark/70">Pop in two birthdays for a free compatibility score. The detailed reading unlocks after you log in.</p>
      <CouplePairForm resultPath="/menu/compat/result" submitLabel="See our score" />
      <div className="space-y-2 rounded-xl border border-line bg-card p-4 text-center shadow-soft">
        <p className="text-sm text-bark/70">Want to check compatibility with a whole group? Share an invite link and everyone sees their score with you.</p>
        <Link href="/menu/compat/room/new" className={buttonClass('secondary')}>Make a group compatibility room</Link>
        <div>
          <Link href="/library" className="text-sm text-acorn underline">See my rooms</Link>
        </div>
      </div>
    </section>
  );
}
