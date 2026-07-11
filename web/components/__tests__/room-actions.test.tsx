import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const extendMock = vi.fn();
const deleteMock = vi.fn();
vi.mock('../../app/library/actions', () => ({
  extendRoomAction: (...a: unknown[]) => extendMock(...a),
  deleteRoomAction: (...a: unknown[]) => deleteMock(...a),
}));
const refreshMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refreshMock }) }));

import { RoomActions } from '../RoomActions';

describe('RoomActions', () => {
  beforeEach(() => {
    extendMock.mockReset();
    deleteMock.mockReset();
    refreshMock.mockReset();
  });

  it('shows "Extend" for active rooms and "Reopen" for expired ones', () => {
    const { unmount } = render(<RoomActions roomId="r1" expired={false} />);
    expect(screen.getByRole('button', { name: 'Extend' })).toBeInTheDocument();
    unmount();
    render(<RoomActions roomId="r1" expired />);
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });

  it('extend success → router.refresh, failure → error message', async () => {
    extendMock.mockResolvedValueOnce(null);
    render(<RoomActions roomId="r1" expired={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Extend' }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    extendMock.mockResolvedValueOnce({ error: 'This room was deleted. Please create a new one.' });
    fireEvent.click(screen.getByRole('button', { name: 'Extend' }));
    await waitFor(() => expect(screen.getByText(/This room was deleted/)).toBeInTheDocument());
    expect(extendMock).toHaveBeenCalledWith('r1');
  });

  it('delete — not called when confirm is cancelled, called when confirmed', async () => {
    deleteMock.mockResolvedValue(null);
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(<RoomActions roomId="r1" expired={false} />);
    confirmSpy.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(deleteMock).not.toHaveBeenCalled();
    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('r1'));
  });
});
