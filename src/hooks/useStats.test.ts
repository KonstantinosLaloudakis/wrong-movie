import { describe, it, expect } from 'vitest';
import { computeStats } from './useStats';
import type { GameHistory, StreakData } from '../types';

const streak: StreakData = { current: 3, best: 7, lastPlayedDate: '2026-06-02' };

describe('computeStats', () => {
  it('returns zeroed stats for empty history', () => {
    const result = computeStats([], streak);
    expect(result.played).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.distribution).toEqual({ hard: 0, medium: 0, easy: 0, miss: 0 });
  });

  it('counts played and distribution correctly', () => {
    const history: GameHistory = [
      { date: '2026-06-01', result: 'hard', puzzleNumber: 1 },
      { date: '2026-06-02', result: 'medium', puzzleNumber: 2 },
      { date: '2026-06-03', result: 'easy', puzzleNumber: 3 },
      { date: '2026-06-04', result: 'miss', puzzleNumber: 4 },
    ];
    const result = computeStats(history, streak);
    expect(result.played).toBe(4);
    expect(result.distribution).toEqual({ hard: 1, medium: 1, easy: 1, miss: 1 });
  });

  it('computes winRate as percentage of non-miss results', () => {
    const history: GameHistory = [
      { date: '2026-06-01', result: 'hard', puzzleNumber: 1 },
      { date: '2026-06-02', result: 'medium', puzzleNumber: 2 },
      { date: '2026-06-03', result: 'miss', puzzleNumber: 3 },
      { date: '2026-06-04', result: 'miss', puzzleNumber: 4 },
    ];
    const result = computeStats(history, streak);
    expect(result.winRate).toBe(50);
  });

  it('rounds winRate to nearest integer', () => {
    const history: GameHistory = [
      { date: '2026-06-01', result: 'hard', puzzleNumber: 1 },
      { date: '2026-06-02', result: 'hard', puzzleNumber: 2 },
      { date: '2026-06-03', result: 'miss', puzzleNumber: 3 },
    ];
    const result = computeStats(history, streak);
    expect(result.winRate).toBe(67); // 2/3 = 66.6... → 67
  });

  it('sources streak values from the streak argument', () => {
    const result = computeStats([], { current: 5, best: 12, lastPlayedDate: null });
    expect(result.currentStreak).toBe(5);
    expect(result.bestStreak).toBe(12);
  });
});
