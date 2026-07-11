import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const trackMock = vi.fn();
vi.mock('@vercel/analytics', () => ({
  track: (...a: unknown[]) => trackMock(...a),
}));

import { TrackLink } from '../TrackLink';
import { TrackOnMount } from '../TrackOnMount';

describe('TrackLink', () => {
  beforeEach(() => trackMock.mockReset());

  it('renders a link and fires the event on click', () => {
    render(
      <TrackLink href="/menu/solo?y=1991" event="full_reading_cta" className="btn">
        See my full reading
      </TrackLink>,
    );
    const link = screen.getByRole('link', { name: 'See my full reading' });
    expect(link).toHaveAttribute('href', '/menu/solo?y=1991');
    fireEvent.click(link);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('full_reading_cta', undefined);
  });

  it('passes props through', () => {
    render(
      <TrackLink href="/x" event="ev" props={{ kind: 'solo', n: 3 }}>go</TrackLink>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'go' }));
    expect(trackMock).toHaveBeenCalledWith('ev', { kind: 'solo', n: 3 });
  });
});

describe('TrackOnMount', () => {
  beforeEach(() => {
    trackMock.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires once on mount (deferred a tick), renders nothing', () => {
    const { container, rerender } = render(
      <TrackOnMount event="checkout_success" props={{ product: 'reading', units: 5 }} />,
    );
    expect(container.innerHTML).toBe('');
    expect(trackMock).not.toHaveBeenCalled(); // tick hasn't passed yet (waiting for Analytics init)
    vi.runAllTimers();
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('checkout_success', { product: 'reading', units: 5 });
    rerender(<TrackOnMount event="checkout_success" props={{ product: 'reading', units: 5 }} />);
    vi.runAllTimers();
    expect(trackMock).toHaveBeenCalledTimes(1); // no refire on rerender
  });

  it('fires only once across an unmount→remount (StrictMode simulation)', () => {
    const { unmount } = render(
      <TrackOnMount event="checkout_success" props={{ product: 'reading', units: 5 }} />,
    );
    unmount(); // first schedule cancelled in cleanup via clearTimeout (before the tick)
    render(
      <TrackOnMount event="checkout_success" props={{ product: 'reading', units: 5 }} />,
    );
    vi.runAllTimers();
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('checkout_success', { product: 'reading', units: 5 });
  });
});
