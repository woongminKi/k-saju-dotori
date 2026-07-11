import type { ReactNode } from 'react';

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-bold text-acorn-dark">{title}</h2>
      <div className="text-bark">{children}</div>
    </section>
  );
}
