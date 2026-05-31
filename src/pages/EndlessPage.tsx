import { useEffect, useState } from 'react';
import { useEndlessGame } from '../hooks/useEndlessGame';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';

export function EndlessPage() {
  const { puzzle, loading, sessionScore, state, fetchNext, submitGuess } =
    useEndlessGame();

  useEffect(() => {
    fetchNext();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !puzzle) {
    return <div className="p-8 text-center text-gray-500">Loading…</div>;
  }

  if (!loading && !puzzle) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No more movies available — impressive!</p>
      </div>
    );
  }

  if (!puzzle) return null;

  const isDone = state.result !== 'unanswered';

  const [shaking, setShaking] = useState(false);

  function handleGuess(guess: string) {
    submitGuess(guess);
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span className="font-medium text-gray-700">Endless Mode</span>
        <span>Score: {sessionScore}</span>
      </div>

      <ClueDisplay
        clues={puzzle.clues}
        revealedDifficulty={state.revealedDifficulty}
      />

      <div className="mt-4 space-y-2">
        {!isDone && (
          <div className={shaking ? 'shake' : ''}>
            <GuessInput onSubmit={handleGuess} />
          </div>
        )}

        {!isDone &&
          state.guesses.map((g, i) => (
            <div
              key={`${i}-${g}`}
              className="rounded bg-red-50 px-3 py-1 text-sm text-red-600"
            >
              ✗ {g}
            </div>
          ))}

        {isDone && (
          <ResultOverlay
            result={state.result}
            movieTitle={puzzle.title}
            posterUrl={puzzle.posterUrl}
            difficulty={state.revealedDifficulty}
            onNext={fetchNext}
            isEndless
          />
        )}
      </div>
    </div>
  );
}
