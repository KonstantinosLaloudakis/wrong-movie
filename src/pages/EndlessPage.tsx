import { useEffect, useMemo, useRef, useState } from 'react';
import { useEndlessGame } from '../hooks/useEndlessGame';
import { getMovieSuggestions } from '../hooks/useMovieSuggestions';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';
import type { GameResultType } from '../types';

interface Props {
  saveEndlessResult: (result: GameResultType) => void;
}

export function EndlessPage({ saveEndlessResult }: Props) {
  const { puzzle, loading, sessionScore, state, fetchNext, submitGuess, movieTitles } =
    useEndlessGame(saveEndlessResult);

  const [inputValue, setInputValue] = useState('');
  const [shaking, setShaking] = useState(false);
  const [showYear, setShowYear] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(
    () => getMovieSuggestions(movieTitles, inputValue),
    [movieTitles, inputValue]
  );

  useEffect(() => {
    fetchNext();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isDone) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') handleNext();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDone]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGuess(guess: string) {
    const correct = submitGuess(guess);
    setInputValue('');
    if (!correct) {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      setShaking(true);
      shakeTimer.current = setTimeout(() => setShaking(false), 300);
    }
  }

  function handleNext() {
    setInputValue('');
    setShowYear(false);
    fetchNext();
  }

  if (loading && !puzzle) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>;
  }

  if (!loading && !puzzle) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">No more movies available — impressive!</p>
      </div>
    );
  }

  if (!puzzle) return null;

  const isDone = state.result !== 'unanswered';

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span className="font-medium text-slate-700">Endless Mode</span>
        <span>Score: {sessionScore}</span>
      </div>

      <ClueDisplay
        clues={puzzle.clues}
        revealedDifficulty={state.revealedDifficulty}
        showAll={state.showAllClues}
      />

      <div className="mt-4 space-y-2">
        {state.revealedDifficulty === 'easy' && state.result === 'unanswered' && (
          <div className="mt-3 text-center">
            {showYear ? (
              <p className="text-sm text-slate-500">
                Released:{' '}
                <span className="font-semibold text-slate-700">{puzzle.releaseYear}</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setShowYear(true)}
                className="text-xs text-slate-400 underline hover:text-slate-600"
              >
                Reveal year
              </button>
            )}
          </div>
        )}

        {!isDone && (
          <div className={shaking ? 'shake' : ''}>
            <GuessInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleGuess}
              autoFocus={true}
              suggestions={suggestions}
              onSuggestionSelect={setInputValue}
            />
          </div>
        )}

        {!isDone &&
          state.guesses.map((g, i) => (
            <div
              key={`${i}-${g}`}
              className="flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-600"
            >
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-[10px]">
                ✕
              </span>
              {g}
            </div>
          ))}

        {isDone && (
          <ResultOverlay
            result={state.result}
            movieTitle={puzzle.title}
            posterUrl={puzzle.posterUrl}
            imdbId={puzzle.imdbId}
            difficulty={state.revealedDifficulty}
            onNext={handleNext}
            isEndless
          />
        )}
      </div>
    </div>
  );
}
