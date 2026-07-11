import type { Metadata } from 'next';
import Link from 'next/link';
import { getStore } from '../../../../../../lib/services';
import { RoomJoinForm } from '../../../../../../components/RoomJoinForm';

export const dynamic = 'force-dynamic';

// Invite-card copy. Returns the same generic text even if the room lookup fails/expires (no throw).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  await params;
  const title = 'How well do we match? 🐿️';
  const description = 'Pop in your birthday for a compatibility score — no sign-up needed.';
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary', title, description },
  };
}

export default async function JoinRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await getStore().getRoom(id);
  if (!room) {
    return (
      <section className="space-y-4">
        <p className="text-bark/70">This room has expired or doesn&apos;t exist.</p>
        <Link href="/" className="text-acorn underline">Go home</Link>
      </section>
    );
  }
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-extrabold text-acorn-dark">Join for a compatibility score</h1>
      <p className="text-sm text-bark/70">Enter a nickname and your birthday to see your compatibility with the friend who invited you. No login needed.</p>
      <RoomJoinForm roomId={id} hostName={room.hostName} />
    </section>
  );
}
