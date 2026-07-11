import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../app/library/actions', () => ({
  extendRoomAction: vi.fn(),
  deleteRoomAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { RoomManageItem } from '../RoomManageItem';

describe('RoomManageItem', () => {
  it('active room — badge, dashboard link, join count, Extend', () => {
    render(
      <ul>
        <RoomManageItem roomId="r1" createdLabel="Room from July 6" badgeLabel="7 days left" expired={false} entryCount={3} />
      </ul>,
    );
    expect(screen.getByText('7 days left')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Room from July 6' })).toHaveAttribute('href', '/menu/compat/room/r1');
    expect(screen.getByText('3 joined')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Extend' })).toBeInTheDocument();
  });

  it('expired room — no link, "Reopen"', () => {
    render(
      <ul>
        <RoomManageItem roomId="r2" createdLabel="Room from July 1" badgeLabel="Expired · deletes in 6 days" expired entryCount={0} />
      </ul>,
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Expired · deletes in 6 days')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });
});
