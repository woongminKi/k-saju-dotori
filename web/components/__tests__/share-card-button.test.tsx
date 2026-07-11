import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const actionMock = vi.fn();
vi.mock('../../app/s/actions', () => ({
  createShareCardAction: (...args: unknown[]) => actionMock(...args),
}));

const trackMock = vi.fn();
vi.mock('@vercel/analytics', () => ({
  track: (...a: unknown[]) => trackMock(...a),
}));

import { ShareCardButton } from '../ShareCardButton';

const INPUT = { kind: 'solo', query: 'y=1991&m=3&d=15&g=F' } as const;

describe('ShareCardButton', () => {
  beforeEach(() => {
    actionMock.mockReset();
    trackMock.mockReset();
  });

  it('success + navigator.share unsupported → clipboard copy + notice', async () => {
    actionMock.mockResolvedValue({ ok: true, url: 'https://dotori.example/s/abcd1234' });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ShareCardButton input={INPUT} title="Dotori" text="My fortune!" label="Share card" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share card' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://dotori.example/s/abcd1234'));
    expect(screen.getByText('Link copied!')).toBeInTheDocument();
    expect(actionMock).toHaveBeenCalledWith(INPUT);
    expect(trackMock).toHaveBeenCalledWith('share_card_create', { kind: 'solo' });
  });

  it('failure → error notice, view stays intact', async () => {
    actionMock.mockResolvedValue({ ok: false, error: 'x' });
    render(<ShareCardButton input={INPUT} title="t" text="x" label="Share card" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share card' }));
    await waitFor(() => expect(screen.getByText(/make that card/)).toBeInTheDocument());
  });

  it('success + share unsupported + clipboard.writeText fails → manual copy notice', async () => {
    actionMock.mockResolvedValue({ ok: true, url: 'https://dotori.example/s/abcd1234' });
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ShareCardButton input={INPUT} title="Dotori" text="My fortune!" label="Share card" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share card' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://dotori.example/s/abcd1234'));
    expect(screen.getByText(/Couldn't copy automatically/)).toBeInTheDocument();
    expect(screen.getByText('https://dotori.example/s/abcd1234')).toBeInTheDocument();
  });

  it('default (fullWidth unset) is w-full', () => {
    render(<ShareCardButton input={INPUT} title="t" text="x" label="Share card" />);
    expect(screen.getByRole('button', { name: 'Share card' })).toHaveClass('w-full');
  });

  it('fullWidth=false — content width (inline-block)', () => {
    render(<ShareCardButton input={INPUT} title="t" text="x" label="Share card" fullWidth={false} />);
    const button = screen.getByRole('button', { name: 'Share card' });
    expect(button).toHaveClass('inline-block');
    expect(button).not.toHaveClass('w-full');
  });
});
