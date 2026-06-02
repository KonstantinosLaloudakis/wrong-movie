import { useEffect, useRef, useState } from 'react';
import { useDailyPuzzle } from '../hooks/useDailyPuzzle';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';
import { ShareButton } from '../components/ShareButton';

interface Props {
  onShowStats: () => void;
}

export function DailyPage({ onShowStats }: Props) {
  const { puzzle, loading, error, state, savedResult, streak, submitGuess } =
    useDailyPuzzle();

  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, []);

  function handleGuess(guess: string) {
    const correct = submitGuess(guess);
    if (!correct) {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      setShaking(true);
      shakeTimer.current = setTimeout(() => setShaking(false), 300);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading today's puzzle…
      </div>
    );
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }
  if (!puzzle) return null;

  const isDone = state.result !== 'unanswered';
  const alreadyPlayedToday = savedResult !== null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span className="font-medium text-gray-700">
          Puzzle #{puzzle.puzzleNumber}
        </span>
        <span>🔥 Streak: {streak.current}</span>
      </div>

      <ClueDisplay
        clues={puzzle.clues}
        revealedDifficulty={state.revealedDifficulty}
      />

      <div className="mt-4 space-y-2">
        {!isDone && !alreadyPlayedToday && (
          <div className={shaking ? 'shake' : ''}>
            <GuessInput onSubmit={handleGuess} />
          </div>
        )}

        {state.guesses.map((g, i) => (
          <div
            key={`${i}-${g}`}
            className="rounded bg-red-50 px-3 py-1 text-sm text-red-600"
          >
            ✗ {g}
          </div>
        ))}

        {isDone && (
          <>
            <ResultOverlay
              result={state.result}
              movieTitle={puzzle.title}
              posterUrl={puzzle.posterUrl}
              difficulty={state.revealedDifficulty}
              onShowStats={onShowStats}
            />
            <ShareButton
              puzzleNumber={puzzle.puzzleNumber}
              result={state.result}
              revealedDifficulty={state.revealedDifficulty}
            />
          </>
        )}

        {alreadyPlayedToday && !isDone && (
          <p className="text-center text-sm text-gray-500">
            You've already played today. Come back tomorrow!
          </p>
        )}
      </div>

      <footer className="mt-10 text-center text-xs text-gray-400">
        This product uses the TMDb API but is not endorsed or certified by TMDb.
      </footer>
    </div>
  );
}
