'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { SingleBirthForm } from './SingleBirthForm';
import { CompatScoreCard } from './CompatScoreCard';
import { submitRoomEntryAction, type SubmitEntryState } from '../app/menu/compat/room/actions';
import { buttonClass } from './ui/Button';
import { ShareCardButton } from './ShareCardButton';

export function RoomJoinForm({ roomId, hostName }: { roomId: string; hostName?: string }) {
  const hostLabel = hostName ?? 'your friend';
  const action = submitRoomEntryAction.bind(null, roomId);
  const [state, formAction] = useActionState<SubmitEntryState, FormData>(action, null);

  if (state && 'score' in state) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-bark/70">Done! Here&apos;s your compatibility with {hostLabel}.</p>
        <CompatScoreCard score={state.score} />
        <Link
          href={`/menu/compat/room/${roomId}/detail?entry=${state.entryId}`}
          className={buttonClass('primary', 'md', 'w-full')}
        >
          See the detailed reading (1 credit)
        </Link>
        <ShareCardButton
          input={{ kind: 'compat', roomId, entryId: state.entryId }}
          title="Dotori compatibility"
          text={`We scored ${state.score.score}/100! Try it 🐿️`}
          label="Share our score card 🐿️"
        />
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input
        name="nickname"
        placeholder="Nickname"
        className="w-full rounded-lg border border-line bg-card px-3 py-2 text-bark focus:outline-none focus:ring-2 focus:ring-acorn/40"
        required
      />
      <SingleBirthForm />
      {state && 'error' in state && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" className={buttonClass('primary', 'md', 'w-full')}>See my score</button>
    </form>
  );
}
