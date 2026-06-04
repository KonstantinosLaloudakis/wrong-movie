import { useEffect, useMemo, useRef, useState } from 'react';
import { useDailyPuzzle } from '../hooks/useDailyPuzzle';
import { getMovieSuggestions } from '../hooks/useMovieSuggestions';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';
import { ShareButton } from '../components/ShareButton';

interface Props {
  onShowStats: () => void;
}

export function DailyPage({ onShowStats }: Props) {
  const { puzzle, loading, error, state, savedResult, streak, submitGuess, movieTitles } =
    useDailyPuzzle();

  const [inputValue, setInputValue] = useState('');
  const [shaking, setShaking] = useState(false);
  const [showYear, setShowYear] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(
    () => getMovieSuggestions(movieTitles, inputValue),
    [movieTitles, inputValue]
  );

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, []);

  function handleGuess(guess: string) {
    const correct = submitGuess(guess);
    setInputValue('');
    if (!correct) {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      setShaking(true);
      shakeTimer.current = setTimeout(() => setShaking(false), 300);
    }
  }

  function handleSuggestionSelect(title: string) {
    setInputValue(title);
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
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
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Puzzle #{puzzle.puzzleNumber}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300">
          🔥 Streak: {streak.current}
        </span>
      </div>

      <ClueDisplay
        clues={puzzle.clues}
        revealedDifficulty={state.revealedDifficulty}
        showAll={state.showAllClues}
      />

      <div className="mt-4 space-y-2">
        {state.revealedDifficulty === 'easy' && state.result === 'unanswered' && !alreadyPlayedToday && (
          <div className="mt-3 text-center">
            {showYear ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Released:{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{puzzle.releaseYear}</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setShowYear(true)}
                className="text-xs text-slate-400 underline hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                Reveal year
              </button>
            )}
          </div>
        )}

        {!isDone && !alreadyPlayedToday && (
          <div className={shaking ? 'shake' : ''}>
            <GuessInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleGuess}
              autoFocus={true}
              suggestions={suggestions}
              onSuggestionSelect={handleSuggestionSelect}
            />
          </div>
        )}

        {state.guesses.map((g, i) => (
          <div
            key={`${i}-${g}`}
            className="flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900 dark:bg-slate-800 dark:text-red-400"
          >
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-[10px]">
              ✕
            </span>
            {g}
          </div>
        ))}

        {isDone && (
          <>
            <ResultOverlay
              result={state.result}
              movieTitle={puzzle.title}
              posterUrl={puzzle.posterUrl}
              imdbId={puzzle.imdbId}
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
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            You've already played today. Come back tomorrow!
          </p>
        )}
      </div>

      <footer className="mt-10 text-center text-xs text-slate-400 dark:text-slate-600">
        This product uses the TMDb API but is not endorsed or certified by TMDb.
      </footer>
    </div>
  );
}
