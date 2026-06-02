import { useLocalStorage } from './useLocalStorage';
import type { GameHistory, StreakData, Stats } from '../types';

export function computeStats(history: GameHistory, streak: StreakData): Stats {
  const played = history.length;
  const distribution = { hard: 0, medium: 0, easy: 0, miss: 0 };

  if (played === 0) {
    return {
      played: 0,
      winRate: 0,
      currentStreak: streak.current,
      bestStreak: streak.best,
      distribution,
    };
  }

  for (const entry of history) {
    distribution[entry.result]++;
  }

  const wins = played - distribution.miss;
  return {
    played,
    winRate: Math.round((wins / played) * 100),
    currentStreak: streak.current,
    bestStreak: streak.best,
    distribution,
  };
}

export function useStats(): Stats {
  const [history] = useLocalStorage<GameHistory>('game-history', []);
  const [streak] = useLocalStorage<StreakData>('streak', {
    current: 0,
    best: 0,
    lastPlayedDate: null,
  });
  return computeStats(history, streak);
}
