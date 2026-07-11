import { describe, it, expect } from 'vitest';
import { encodeBirth, decodeBirth, type BirthFields } from '../birth-params';
import { buildChart } from '../engine';

// Verifies the end-to-end shape contract: a BirthFields round-tripped through the URL codec
// decodes into exactly the object engine.ts's buildChart (internationalBirthToSajuChart) consumes.

const sample: BirthFields = {
  year: 1988, month: 11, day: 3, hour: 6, minute: 45,
  gender: 'F', timeZone: 'America/Los_Angeles', longitude: -118.2437,
};

describe('birth-params -> buildChart wiring', () => {
  it('decoded fields feed buildChart and produce a usable chart', () => {
    const decoded = decodeBirth(new URLSearchParams(encodeBirth(sample)));
    expect(decoded).toEqual(sample);

    const chart = buildChart(decoded);
    expect(chart.dayStem).toBeTruthy();
    expect(chart.base.pillars.year.stem).toBeTruthy();
    expect(chart.base.pillars.day.stem).toBeTruthy();
  });

  it('unknown birth time still produces a chart (timeUnknown path)', () => {
    const noTime: BirthFields = {
      year: 2001, month: 2, day: 14,
      gender: 'M', timeZone: 'Asia/Seoul', longitude: 126.978,
    };
    const decoded = decodeBirth(new URLSearchParams(encodeBirth(noTime)));
    expect(decoded.hour).toBeUndefined();
    const chart = buildChart(decoded);
    expect(chart.dayStem).toBeTruthy();
  });
});
