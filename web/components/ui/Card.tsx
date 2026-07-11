import type { HTMLAttributes } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement>;

/** Base card surface in the warm Dotori tone. Merge layout/spacing overrides via className. */
export function Card({ className, children, ...props }: CardProps) {
  const merged = ['bg-card border border-line rounded-xl shadow-soft p-5', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={merged} {...props}>
      {children}
    </div>
  );
}
