import type { Metadata } from 'next';
import Link from 'next/link';
import { getAuth } from '../../../../../lib/services';
import { SingleBirthForm } from '../../../../../components/SingleBirthForm';
import { createCompatRoomAction } from '../actions';
import { buttonClass } from '../../../../../components/ui/Button';
import { RateLimitNotice } from '../../../../../components/RateLimitNotice';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'New Compatibility Room' };

export default async function NewRoomPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rateLimited = (await searchParams)['rl'] === '1';
  const user = await getAuth().getCurrentUser();
  if (!user) {
    return (
      <section className="space-y-4 text-center">
        <h1 className="text-2xl font-extrabold text-acorn-dark">Make a compatibility room</h1>
        <p className="text-sm text-bark/70">Log in to create a room.</p>
        <Link href="/login?next=/menu/compat/room/new" className={buttonClass('primary')}>Log in</Link>
      </section>
    );
  }
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Make a compatibility room</h1>
      <p className="text-sm text-bark/70">Enter your birthday to get an invite link for friends. You&apos;ll see everyone&apos;s scores ranked.</p>
      {rateLimited && <RateLimitNotice />}
      <form action={createCompatRoomAction} className="space-y-4">
        <SingleBirthForm />
        <button type="submit" className={buttonClass('primary', 'md', 'w-full')}>Create room</button>
      </form>
    </section>
  );
}
