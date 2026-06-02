import { useLocalStorage } from './useLocalStorage';
import type { EndlessHistory, EndlessStats, GameResultType } from '../types';

export function computeEndlessStats(history: EndlessHistory): EndlessStats {
  const played = history.length;
  const distribution = { hard: 0, medium: 0, easy: 0, miss: 0 };

  if (played === 0) {
    return { played: 0, winRate: 0, distribution };
  }

  for (const entry of history) {
    distribution[entry.result]++;
  }

  const wins = played - distribution.miss;
  return {
    played,
    winRate: Math.round((wins / played) * 100),
    distribution,
  };
}

export function useEndlessStats() {
  const [history, setHistory] = useLocalStorage<EndlessHistory>('endless-history', []);

  function saveEndlessResult(result: GameResultType) {
    setHistory((prev) => [...prev, { result, playedAt: new Date().toISOString() }]);
  }

  return { stats: computeEndlessStats(history), saveEndlessResult };
}
