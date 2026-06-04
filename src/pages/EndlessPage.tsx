// src/pages/EndlessPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEndlessGame } from '../hooks/useEndlessGame';
import { getMovieSuggestions } from '../hooks/useMovieSuggestions';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';
import { GenreFilter } from '../components/GenreFilter';
import { GENRE_FILTERS } from '../config/genres';
import { getActivePack } from '../config/packs';
import type { GameResultType, ActiveFilter } from '../types';

interface Props {
  saveEndlessResult: (result: GameResultType) => void;
}

export function EndlessPage({ saveEndlessResult }: Props) {
  const activePack = useMemo(() => getActivePack(), []);

  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  const activeFilter = useMemo((): ActiveFilter | null => {
    if (!activeFilterId) return null;
    if (activePack && activeFilterId === activePack.id) {
      return { kind: 'pack', movieIds: activePack.movieIds };
    }
    const opt = GENRE_FILTERS.find((f) => f.id === activeFilterId);
    if (!opt) return null;
    if (opt.kind === 'genre')  return { kind: 'genre',  genreValue:  opt.genreValue };
    if (opt.kind === 'decade') return { kind: 'decade', decadeValue: opt.decadeValue };
    return null;
  }, [activeFilterId, activePack]);

  const didMountRef = useRef(false);

  const { puzzle, loading, sessionScore, state, fetchNext, submitGuess, movieTitles } =
    useEndlessGame(saveEndlessResult, activeFilter);

  const [inputValue, setInputValue] = useState('');
  const [shaking, setShaking] = useState(false);
  const [showYear, setShowYear] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(
    () => getMovieSuggestions(movieTitles, inputValue),
    [movieTitles, inputValue]
  );

  const isDone = state.result !== 'unanswered';

  useEffect(() => {
    fetchNext();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setInputValue('');
    setShowYear(false);
    fetchNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  useEffect(() => {
    if (!isDone) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
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

  function handleFilterSelect(id: string | null) {
    setActiveFilterId(id);
  }

  const activeFilterLabel = useMemo(() => {
    if (!activeFilterId) return null;
    if (activePack && activeFilterId === activePack.id) return activePack.name;
    return GENRE_FILTERS.find((f) => f.id === activeFilterId)?.label ?? null;
  }, [activeFilterId, activePack]);

  if (loading && !puzzle) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>;
  }

  if (!loading && !puzzle) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">
          {activeFilterLabel
            ? `No more ${activeFilterLabel} movies available — try a different filter or switch to All.`
            : 'No more movies available — impressive!'}
        </p>
      </div>
    );
  }

  if (!puzzle) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span className="font-medium text-slate-700 dark:text-slate-300">Endless Mode</span>
        <span className="dark:text-slate-400">Score: {sessionScore}</span>
      </div>

      <div className="mb-4">
        <GenreFilter
          activeId={activeFilterId}
          onSelect={handleFilterSelect}
          activePack={activePack}
        />
      </div>

      <ClueDisplay
        clues={puzzle.clues}
        revealedDifficulty={state.revealedDifficulty}
        showAll={state.showAllClues}
      />

      <div className="mt-4 space-y-2">
        {state.revealedDifficulty === 'easy' && state.result === 'unanswered' && puzzle.releaseYear !== null && (
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
              className="flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900 dark:bg-slate-800 dark:text-red-400"
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
