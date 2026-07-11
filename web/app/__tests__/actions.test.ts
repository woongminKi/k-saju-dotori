import { describe, it, expect, beforeAll } from 'vitest';
import { createShareCardAction } from '../s/actions';
import { getStore } from '../../lib/services';
import { createRoomForHost, submitEntry } from '../../lib/rooms';
import { encodeBirth, type BirthFields } from '../../lib/birth-params';
import type { SoloCardPayload, CompatCardPayload } from '../../lib/share-cards';

beforeAll(() => {
  process.env.PII_ENC_KEY = '0'.repeat(64);
  process.env.PII_HASH_KEY = 'test-hash-key';
});

const host: BirthFields = {
  year: 1990, month: 5, day: 15, hour: 14, minute: 30,
  gender: 'M', timeZone: 'America/New_York', longitude: -74.006,
};
const guest: BirthFields = {
  year: 1992, month: 3, day: 20, hour: 9, minute: 0,
  gender: 'F', timeZone: 'Europe/London', longitude: -0.1276,
};

function idFromUrl(url: string): string {
  return url.split('/s/')[1]!;
}

describe('createShareCardAction', () => {
  it('solo — persists a real recomputed payload (character, stem label, elements), not just {kind}', async () => {
    const query = new URLSearchParams(encodeBirth(host)).toString();
    const res = await createShareCardAction({ kind: 'solo', query });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const card = await getStore().getShareCard(idFromUrl(res.url));
    expect(card).toBeDefined();
    const payload = JSON.parse(card!.payloadJson) as SoloCardPayload;
    expect(payload.kind).toBe('solo');
    expect(payload.characterName.length).toBeGreaterThan(0);
    expect(payload.stemLabel).toContain('day master');
    expect(payload.line.length).toBeGreaterThan(0);
    expect(Object.keys(payload.elements).sort()).toEqual(['Earth', 'Fire', 'Metal', 'Water', 'Wood']);
    const total = Object.values(payload.elements).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('compat — recomputes score/tier server-side from roomId+entryId', async () => {
    const store = getStore();
    const room = await createRoomForHost(store, 'host-user', host, Date.now(), 'Riley');
    const { entryId, score } = await submitEntry(store, room.id, 'Sam', guest);

    const res = await createShareCardAction({ kind: 'compat', roomId: room.id, entryId });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const card = await store.getShareCard(idFromUrl(res.url));
    expect(card).toBeDefined();
    expect(card!.roomId).toBe(room.id);
    const payload = JSON.parse(card!.payloadJson) as CompatCardPayload;
    expect(payload.kind).toBe('compat');
    expect(payload.score).toBe(score.score); // recomputed, matches the room entry's score
    expect(payload.tier.length).toBeGreaterThan(0);
    expect(payload.line.length).toBeGreaterThan(0);
    expect(payload.hostName).toBe('Riley');
    expect(payload.guestNickname).toBe('Sam');
  });

  it('compat — missing room/entry fails gracefully (no throw)', async () => {
    const res = await createShareCardAction({ kind: 'compat', roomId: 'nope', entryId: 'nope' });
    expect(res.ok).toBe(false);
  });

  it('solo — invalid birth query fails gracefully (no throw)', async () => {
    const res = await createShareCardAction({ kind: 'solo', query: 'y=99' });
    expect(res.ok).toBe(false);
  });
});
