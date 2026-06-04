// src/config/packs.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We test getActivePack by injecting a test pack array directly,
// since vi.mock + require() doesn't work reliably in Vitest ESM projects.
// The function under test reads SEASONAL_PACKS at call time; we expose
// a testable variant that accepts the pack list as a parameter.
import * as packsModule from './packs';

// Helper: call getActivePack with a temporary SEASONAL_PACKS override.
function getActivePackWith(packs: packsModule.SeasonalPack[]): packsModule.SeasonalPack | null {
  const original = packsModule.SEASONAL_PACKS;
  // Replace the exported array contents for the duration of this call.
  original.length = 0;
  packs.forEach(p => original.push(p));
  const result = packsModule.getActivePack();
  // Restore
  original.length = 0;
  return result;
}

const TEST_PACK: packsModule.SeasonalPack = {
  id: 'horror-2026',
  name: 'Horror Week',
  emoji: '🎃',
  movieIds: ['id-1', 'id-2'],
  startDate: '2026-10-25',
  endDate:   '2026-11-01',
};

describe('getActivePack', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.useRealTimers();
    // Ensure SEASONAL_PACKS is always restored to empty after each test
    packsModule.SEASONAL_PACKS.length = 0;
  });

  it('returns the pack when today is within its range', () => {
    vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    const result = getActivePackWith([TEST_PACK]);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('horror-2026');
  });

  it('returns the pack on the start date', () => {
    vi.setSystemTime(new Date('2026-10-25T00:00:00Z'));
    const result = getActivePackWith([TEST_PACK]);
    expect(result).not.toBeNull();
  });

  it('returns the pack on the end date', () => {
    vi.setSystemTime(new Date('2026-11-01T23:59:59Z'));
    const result = getActivePackWith([TEST_PACK]);
    expect(result).not.toBeNull();
  });

  it('returns null before the start date', () => {
    vi.setSystemTime(new Date('2026-10-24T23:59:59Z'));
    const result = getActivePackWith([TEST_PACK]);
    expect(result).toBeNull();
  });

  it('returns null after the end date', () => {
    vi.setSystemTime(new Date('2026-11-02T00:00:00Z'));
    const result = getActivePackWith([TEST_PACK]);
    expect(result).toBeNull();
  });
});
