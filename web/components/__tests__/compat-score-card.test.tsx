import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompatScoreCard } from '../CompatScoreCard';
import type { CompatScore } from '@engine/compatibility';

const score: CompatScore = {
  score: 88,
  tier: '천생연분',
  breakdown: { dayStemRelation: 40, elementComplement: 30, branchHarmony: 18 },
};

describe('CompatScoreCard', () => {
  it('renders the score, the English tier label, and a teaser', () => {
    render(<CompatScoreCard score={score} />);
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('Soulmates')).toBeInTheDocument();
    expect(screen.getByText(/soulmate energy/)).toBeInTheDocument(); // tierTeaserEn('천생연분')
  });
});
