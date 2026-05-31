import type { Difficulty, GuessResult } from '../types';

const POINTS_MAP: Record<Difficulty, number> = { hard: 3, medium: 2, easy: 1 };

interface Props {
  result: GuessResult;
  movieTitle: string;
  posterUrl: string | null;
  difficulty: Difficulty;
  onNext?: () => void;
  isEndless?: boolean;
}

export function ResultOverlay({
  result,
  movieTitle,
  posterUrl,
  difficulty,
  onNext,
  isEndless,
}: Props) {
  if (result === 'unanswered') return null;

  const points = result === 'correct' ? POINTS_MAP[difficulty] : 0;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
      {result === 'correct' ? (
        <p className="text-lg font-bold text-green-600">Correct! +{points} pts</p>
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
      {isEndless && onNext && (
        <button
          type="button"
          onClick={onNext}
          className="mt-4 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Next Movie →
        </button>
      )}
    </div>
  );
}
