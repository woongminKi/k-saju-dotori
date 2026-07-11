import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CouplePairForm } from '../CouplePairForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('CouplePairForm', () => {
  it('renders you/partner inputs and the given submit label', () => {
    render(<CouplePairForm resultPath="/menu/compat/result" submitLabel="See our score" />);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Your partner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See our score' })).toBeInTheDocument();
  });
});
