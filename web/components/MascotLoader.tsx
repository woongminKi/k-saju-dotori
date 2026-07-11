import { LoadingRotator } from './LoadingRotator';

/** CSS/emoji loader — no bundled mascot image asset (simplified from the Korean image loader). */
export function MascotLoader({ hint }: { hint?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-sand">
        <span aria-hidden="true" className="animate-dotori-shake text-7xl">🐿️</span>
      </div>
      <LoadingRotator />
      {hint ? <p className="text-sm text-bark/70">{hint}</p> : null}
    </div>
  );
}
