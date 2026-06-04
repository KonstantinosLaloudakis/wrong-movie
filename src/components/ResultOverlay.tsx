import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Difficulty, GuessResult } from '../types';

const POINTS_MAP: Record<Difficulty, number> = { hard: 3, medium: 2, easy: 1 };

const BADGE_CONFIG: Record<Difficulty, { label: string; classes: string }> = {
  hard:   { label: 'Hard',   classes: 'bg-red-50 text-red-700' },
  medium: { label: 'Medium', classes: 'bg-amber-50 text-amber-700' },
  easy:   { label: 'Easy',   classes: 'bg-green-50 text-green-700' },
};

interface Props {
  result: GuessResult;
  movieTitle: string;
  posterUrl: string | null;
  difficulty: Difficulty;
  imdbId?: string | null;
  onNext?: () => void;
  onShowStats?: () => void;
  isEndless?: boolean;
}

export function ResultOverlay({
  result,
  movieTitle,
  posterUrl,
  difficulty,
  imdbId,
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

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
      {result === 'correct' ? (
        <div className="mb-3 flex items-center justify-center gap-2">
          <span
            className={`badge-pop inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${badge.classes}`}
          >
            {badge.label}
          </span>
          <span className="text-sm font-semibold text-slate-500">
            +{points} pt{points !== 1 ? 's' : ''}
          </span>
        </div>
      ) : (
        <p className="mb-1 text-lg font-bold text-red-500">Not quite — the answer was:</p>
      )}

      <p className="text-xl font-semibold text-slate-900">{movieTitle}</p>

      {posterUrl && (
        <img
          src={posterUrl}
          alt={movieTitle}
          className="mx-auto mt-3 h-72 w-auto rounded object-cover shadow"
        />
      )}

      {imdbId && (
        <a
          href={`https://www.imdb.com/title/${imdbId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-slate-400 hover:text-slate-600 underline"
        >
          View on IMDb →
        </a>
      )}

      <div className="mt-4 flex justify-center gap-3">
        {isEndless && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Next Movie →
          </button>
        )}
        {onShowStats && (
          <button
            type="button"
            aria-label="stats"
            onClick={onShowStats}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            📊 Stats
          </button>
        )}
      </div>
    </div>
  );
}
