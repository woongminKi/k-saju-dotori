import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShareCardView } from '../ShareCardView';

// Phase-6 scope reduction: ShareCardView renders a generic, honest brand card + CTA (no character
// or compatibility-tier copy). It takes only a `cta` prop.
describe('ShareCardView', () => {
  it('renders the Dotori brand card and the default CTA', () => {
    render(<ShareCardView cta={{ href: '/', label: 'Get your own reading →' }} />);
    expect(screen.getByText('Dotori')).toBeInTheDocument();
    expect(screen.getByText(/one acorn at a time/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get your own reading →' })).toHaveAttribute('href', '/');
  });

  it('renders a compat-room join CTA when given one', () => {
    render(<ShareCardView cta={{ href: '/menu/compat/room/r1/join', label: 'Check your compatibility too' }} />);
    expect(screen.getByRole('link', { name: 'Check your compatibility too' })).toHaveAttribute(
      'href',
      '/menu/compat/room/r1/join',
    );
  });
});
