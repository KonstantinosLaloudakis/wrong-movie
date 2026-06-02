import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Difficulty, GuessResult } from '../types';

const POINTS_MAP: Record<Difficulty, number> = { hard: 3, medium: 2, easy: 1 };

const BADGE_CONFIG: Record<Difficulty, { label: string; bg: string }> = {
  hard:   { label: '🔴 Hard',   bg: 'bg-red-600' },
  medium: { label: '🟡 Medium', bg: 'bg-amber-500' },
  easy:   { label: '🟢 Easy',   bg: 'bg-green-600' },
};

const OVERLAY_BG: Record<Difficulty, string> = {
  hard:   'bg-red-50',
  medium: 'bg-amber-50',
  easy:   'bg-green-50',
};

interface Props {
  result: GuessResult;
  movieTitle: string;
  posterUrl: string | null;
  difficulty: Difficulty;
  onNext?: () => void;
  onShowStats?: () => void;
  isEndless?: boolean;
}

export function ResultOverlay({
  result,
  movieTitle,
  posterUrl,
  difficulty,
  onNext,
  onShowStats,
  isEndless,
}: Props) {
  useEffect(() => {
    if (result === 'correct' && difficulty === 'hard') {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { x: 0.5, y: 1 },
        colors: ['#dc2626', '#f59e0b', '#16a34a', '#3b82f6', '#8b5cf6'],
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (result === 'unanswered') return null;

  const points = POINTS_MAP[difficulty];
  const badge = BADGE_CONFIG[difficulty];
  const overlayBg = result === 'correct' ? OVERLAY_BG[difficulty] : 'bg-white';

  return (
    <div className={`mt-4 rounded-lg border border-gray-200 p-5 text-center shadow-sm ${overlayBg}`}>
      {result === 'correct' ? (
        <div
          className={`badge-pop mx-auto mb-2 inline-block rounded-full px-4 py-1.5 text-sm font-bold text-white ${badge.bg}`}
        >
          {badge.label} · +{points} pt{points !== 1 ? 's' : ''}
        </div>
      ) : (
        <p className="text-lg font-bold text-red-500">Not quite — the answer was:</p>
      )}

      <p className="mt-1 text-xl font-semibold text-gray-900">{movieTitle}</p>

      {posterUrl && (
        <img
          src={posterUrl}
          alt={movieTitle}
          className="mx-auto mt-3 h-44 w-auto rounded object-cover shadow"
        />
      )}

      <div className="mt-4 flex justify-center gap-3">
        {isEndless && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Next Movie →
          </button>
        )}
        {onShowStats && (
          <button
            type="button"
            aria-label="stats"
            onClick={onShowStats}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            📊 Stats
          </button>
        )}
      </div>
    </div>
  );
}
