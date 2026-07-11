import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'sm';

const base = 'inline-flex items-center justify-center rounded-xl font-semibold transition';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-acorn text-cream hover:bg-acorn-dark',
  secondary: 'bg-card border border-line text-bark hover:bg-sand',
  ghost: 'text-acorn hover:underline',
};

const sizeClass: Record<ButtonSize, string> = {
  md: 'px-5 py-3',
  sm: 'px-3 py-1.5 text-sm',
};

/**
 * Returns the className string for a variant/size combo. Kept as a pure function (not a
 * component) so it can be attached to <Link>, <button>, or a form submit button alike.
 */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return [base, variantClass[variant], sizeClass[size], className].filter(Boolean).join(' ');
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}
