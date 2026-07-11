import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShareCardView } from '../ShareCardView';
import type { SoloCardPayload, CompatCardPayload } from '../../lib/share-cards';

const solo: SoloCardPayload = {
  kind: 'solo',
  characterName: 'The Steady Oak',
  stemLabel: 'Yang Wood day master',
  elements: { Wood: 4, Fire: 1, Earth: 2, Metal: 1, Water: 0 },
  line: 'The friend who is still standing after the storm.',
};
const compat: CompatCardPayload = {
  kind: 'compat',
  score: 88,
  tier: 'Soulmates',
  line: "Okay, this one's giving soulmate energy.",
  hostName: 'Riley',
  guestNickname: 'Sam',
};
const cta = { href: '/', label: 'Get your own reading →' };

describe('ShareCardView', () => {
  it('renders the real solo card (character, stem label, element labels, line)', () => {
    render(<ShareCardView payloadJson={JSON.stringify(solo)} cta={cta} />);
    expect(screen.getByText('The Steady Oak')).toBeInTheDocument();
    expect(screen.getByText('Yang Wood day master')).toBeInTheDocument();
    expect(screen.getByText('Wood')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText(/still standing after the storm/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get your own reading →' })).toHaveAttribute('href', '/');
  });

  it('renders the real compat card (score, tier, host ♥ guest, line)', () => {
    const compatCta = { href: '/menu/compat/room/r1/join', label: 'Check your compatibility too' };
    render(<ShareCardView payloadJson={JSON.stringify(compat)} cta={compatCta} />);
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('Soulmates')).toBeInTheDocument();
    expect(screen.getByText(/Riley/)).toBeInTheDocument();
    expect(screen.getByText(/Sam/)).toBeInTheDocument();
    expect(screen.getByText(/soulmate energy/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Check your compatibility too' })).toHaveAttribute(
      'href',
      '/menu/compat/room/r1/join',
    );
  });

  it('malformed payload degrades to the generic brand card (no throw)', () => {
    render(<ShareCardView payloadJson="{not valid json" cta={cta} />);
    expect(screen.getByText('Dotori')).toBeInTheDocument();
    expect(screen.getByText(/one acorn at a time/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get your own reading →' })).toHaveAttribute('href', '/');
  });
});
