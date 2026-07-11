'use client';

import { useState } from 'react';
import type { MenuResult, MenuSection } from '@engine/menus/types';
import { Card } from './ui/Card';
import { buttonClass } from './ui/Button';

function EntertainmentNote() {
  return (
    <p className="pt-2 text-center text-xs text-bark/60">
      For entertainment and self-reflection only — not professional advice.
    </p>
  );
}

function SectionCard({ s }: { s: MenuSection }) {
  return (
    <Card className="p-6">
      <h2 className="mb-2 font-bold text-acorn-dark">{s.title}</h2>
      {s.ok && s.body ? (
        <p className="whitespace-pre-line leading-relaxed text-bark">{s.body}</p>
      ) : (
        <p className="text-sm text-bark/60">This part didn&apos;t generate. Try again in a moment.</p>
      )}
    </Card>
  );
}

export function MenuResultView({ result }: { result: MenuResult }) {
  const [expanded, setExpanded] = useState(false);
  const overall = result.sections.find((s) => s.id === 'overall');

  // Single-section menus with no overall section render flat (no toggle).
  if (!overall) {
    return (
      <div className="space-y-4">
        {result.sections.map((s) => (
          <SectionCard key={s.id} s={s} />
        ))}
        <EntertainmentNote />
      </div>
    );
  }

  const details = result.sections.filter((s) => s.id !== overall.id);

  return (
    <div className="space-y-4">
      <Card className="p-6 border-acorn/30">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-acorn/10 px-2 py-0.5 text-xs font-semibold text-acorn-dark">
            Summary
          </span>
          <h2 className="font-bold text-acorn-dark">{overall.title}</h2>
        </div>
        {overall.ok && overall.body ? (
          <p className="whitespace-pre-line leading-relaxed text-bark">{overall.body}</p>
        ) : (
          <p className="text-sm text-bark/60">This part didn&apos;t generate. Try again in a moment.</p>
        )}
      </Card>

      <button
        type="button"
        className={buttonClass('secondary', 'md', 'w-full')}
        aria-expanded={expanded}
        aria-controls="menu-result-details"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Show less ▴' : 'Show more ▾'}
      </button>

      {expanded && (
        <div id="menu-result-details" className="space-y-4">
          {details.map((s) => (
            <SectionCard key={s.id} s={s} />
          ))}
        </div>
      )}
      <EntertainmentNote />
    </div>
  );
}
