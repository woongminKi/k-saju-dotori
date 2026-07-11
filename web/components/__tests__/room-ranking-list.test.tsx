import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoomRankingList } from '../RoomRankingList';
import type { CompatRoomEntry } from '../../lib/store';

const entries: CompatRoomEntry[] = [
  { id: 'e1', roomId: 'r', nickname: 'Maya', guestBirthEncrypted: 'x', score: 90, createdAt: 1 },
  { id: 'e2', roomId: 'r', nickname: 'Chloe', guestBirthEncrypted: 'x', score: 70, createdAt: 2 },
];

describe('RoomRankingList', () => {
  it('renders nicknames and scores in order', () => {
    render(<RoomRankingList entries={entries} roomId="r" />);
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.getByText('Chloe')).toBeInTheDocument();
    expect(screen.getByText(/90/)).toBeInTheDocument();
    expect(screen.getByText(/70/)).toBeInTheDocument();
  });

  it('shows a prompt when there are no entries', () => {
    render(<RoomRankingList entries={[]} roomId="r" />);
    expect(screen.getByText(/joined yet/)).toBeInTheDocument();
  });
});
