import { describe, it, expect } from 'vitest';
import { computeEndlessStats } from './useEndlessStats';
import type { EndlessHistory } from '../types';

describe('computeEndlessStats', () => {
  it('returns zeroed stats for empty history', () => {
    const result = computeEndlessStats([]);
    expect(result.played).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.distribution).toEqual({ hard: 0, medium: 0, easy: 0, miss: 0 });
  });

  it('counts played and distribution correctly', () => {
    const history: EndlessHistory = [
      { result: 'hard',   playedAt: '2026-06-03T10:00:00.000Z' },
      { result: 'medium', playedAt: '2026-06-03T10:05:00.000Z' },
      { result: 'easy',   playedAt: '2026-06-03T10:10:00.000Z' },
      { result: 'miss',   playedAt: '2026-06-03T10:15:00.000Z' },
    ];
    const result = computeEndlessStats(history);
    expect(result.played).toBe(4);
    expect(result.distribution).toEqual({ hard: 1, medium: 1, easy: 1, miss: 1 });
  });

  it('computes winRate as percentage of non-miss results', () => {
    const history: EndlessHistory = [
      { result: 'hard',   playedAt: '2026-06-03T10:00:00.000Z' },
      { result: 'medium', playedAt: '2026-06-03T10:05:00.000Z' },
      { result: 'miss',   playedAt: '2026-06-03T10:10:00.000Z' },
      { result: 'miss',   playedAt: '2026-06-03T10:15:00.000Z' },
    ];
    const result = computeEndlessStats(history);
    expect(result.winRate).toBe(50);
  });

  it('rounds winRate to nearest integer', () => {
    const history: EndlessHistory = [
      { result: 'hard', playedAt: '2026-06-03T10:00:00.000Z' },
      { result: 'hard', playedAt: '2026-06-03T10:05:00.000Z' },
      { result: 'miss', playedAt: '2026-06-03T10:10:00.000Z' },
    ];
    const result = computeEndlessStats(history);
    expect(result.winRate).toBe(67); // 2/3 = 66.6... → 67
  });
});
