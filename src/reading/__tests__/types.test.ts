import { describe, it, expect } from 'vitest';
import type { ReadingModuleId, ModuleReading, FullReading } from '../types';
import { READING_MODULE_IDS } from '../types';

describe('reading types', () => {
  it('READING_MODULE_IDS 는 8개 모듈을 순서대로 가진다', () => {
    expect(READING_MODULE_IDS).toEqual([
      'ilgan', 'ilju', 'ohaeng', 'sipsin', 'twelveStates', 'sinsal', 'hapchung', 'overall',
    ]);
  });
  it('ModuleReading / FullReading 형태를 만족하는 객체를 만들 수 있다', () => {
    const m: ModuleReading = { module: 'ilgan' as ReadingModuleId, title: '일간 본질', body: '본문임', ok: true };
    const r: FullReading = { modules: [m], promptVersion: 'v', partial: false };
    expect(r.modules[0]?.ok).toBe(true);
  });
});
