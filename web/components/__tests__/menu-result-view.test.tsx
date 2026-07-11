import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuResultView } from '../MenuResultView';
import type { MenuResult } from '@engine/menus/types';

function baseResult(sections: MenuResult['sections']): MenuResult {
  return {
    menu: 'solo',
    sections,
    teaser: 'teaser',
    locked: false,
    promptVersion: 'v1',
    partial: false,
  };
}

describe('MenuResultView', () => {
  it('renders flat (no toggle) for a single-section menu with no overall section', () => {
    render(
      <MenuResultView
        result={baseResult([{ id: 'career', title: 'Career', body: 'A good year ahead.', ok: true }])}
      />,
    );
    expect(screen.getByText('A good year ahead.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });

  it('shows the overall section first, keeps the rest collapsed, and toggles them open', () => {
    render(
      <MenuResultView
        result={baseResult([
          { id: 'daymaster', title: 'Day master', body: 'A calm grain.', ok: true },
          { id: 'overall', title: 'Overall', body: 'The big picture.', ok: true },
        ])}
      />,
    );

    expect(screen.getByText('The big picture.')).toBeInTheDocument();
    expect(screen.queryByText('A calm grain.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show more/ }));
    expect(screen.getByText('A calm grain.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show less/ }));
    expect(screen.queryByText('A calm grain.')).not.toBeInTheDocument();
  });

  it('shows a fallback notice for a failed section', () => {
    render(
      <MenuResultView
        result={baseResult([{ id: 'career', title: 'Career', body: '', ok: false }])}
      />,
    );
    expect(screen.getByText(/didn't generate/)).toBeInTheDocument();
  });
});
