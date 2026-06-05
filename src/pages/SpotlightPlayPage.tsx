import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSpotlightById } from '../config/spotlights';
import { useSpotlightGame, buildSpotlightShareText, OUTCOME_EMOJI } from '../hooks/useSpotlightGame';
import { getMovieSuggestions } from '../hooks/useMovieSuggestions';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';
import type { SpotlightConfig } from '../config/spotlights';


export function SpotlightPlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const spotlight = id ? getSpotlightById(id) : null;

  if (!spotlight) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-500 dark:text-slate-400">Spotlight not found.</p>
        <button
          onClick={() => navigate('/spotlight')}
          className="mt-4 text-sm text-indigo-600 underline dark:text-indigo-400"
        >
          Back to Spotlights
        </button>
      </div>
    );
  }

  return <SpotlightGame spotlight={spotlight} />;
}

function SpotlightGame({ spotlight }: { spotlight: SpotlightConfig }) {
  const navigate = useNavigate();
  const {
    movies,
    loading,
    currentIndex,
    currentPuzzle,
    state,
    sessionScore,
    totalMovies,
    roundOutcomes,
    isComplete,
    submitGuess,
    advance,
    movieTitles,
  } = useSpotlightGame(spotlight);

  const [inputValue, setInputValue] = useState('');
  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  const suggestions = useMemo(
    () => getMovieSuggestions(movieTitles, inputValue),
    [movieTitles, inputValue]
  );

  const isDone = state.result !== 'unanswered';

  useEffect(() => {
    return () => { if (shakeTimer.current) clearTimeout(shakeTimer.current); };
  }, []);

  const handleNext = useCallback(() => {
    setInputValue('');
    advance();
  }, [advance]);

  useEffect(() => {
    if (!isDone) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') { e.preventDefault(); handleNext(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDone, handleNext]);

  function handleGuess(guess: string) {
    const correct = submitGuess(guess);
    setInputValue('');
    if (!correct) {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      setShaking(true);
      shakeTimer.current = setTimeout(() => setShaking(false), 300);
    }
  }

  function handleShare() {
    const text = buildSpotlightShareText(
      spotlight.name,
      sessionScore,
      totalMovies * 3,
      roundOutcomes
    );
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>;
  }

  if (!loading && movies.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-500 dark:text-slate-400">No movies available for this spotlight yet.</p>
        <button
          onClick={() => navigate('/spotlight')}
          className="mt-4 text-sm text-indigo-600 underline dark:text-indigo-400"
        >
          Back to Spotlights
        </button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {spotlight.name} Spotlight
        </p>
        <p className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
          {sessionScore} <span className="text-2xl font-medium text-slate-400">/ {totalMovies * 3}</span>
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-1 text-2xl">
          {roundOutcomes.map((o, i) => (
            <span key={i}>{OUTCOME_EMOJI[o]}</span>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={handleShare}
            className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {copied ? 'Copied!' : 'Share result'}
          </button>
          <button
            onClick={() => navigate('/spotlight')}
            className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Back to Spotlights
          </button>
        </div>
      </div>
    );
  }

  if (!currentPuzzle) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-3 flex items-center justify-between text-sm">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {spotlight.name} Spotlight
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Movie {currentIndex + 1} of {totalMovies}
          </p>
        </div>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Score: {sessionScore}
        </span>
      </div>

      <div className="mb-4 flex gap-1">
        {movies.map((_, i) => {
          const outcome = roundOutcomes[i];
          const isCurrent = i === currentIndex;
          const color = isCurrent
            ? 'bg-indigo-500'
            : outcome === 'hard'
            ? 'bg-green-500'
            : outcome === 'medium' || outcome === 'easy'
            ? 'bg-yellow-400'
            : outcome === 'miss'
            ? 'bg-red-400'
            : 'bg-slate-200 dark:bg-slate-700';
          return <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${color}`} />;
        })}
      </div>

      <ClueDisplay
        clues={currentPuzzle.clues}
        revealedDifficulty={state.revealedDifficulty}
        showAll={state.showAllClues}
      />

      <div className="mt-4 space-y-2">
        {!isDone && (
          <div className={shaking ? 'shake' : ''}>
            <GuessInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleGuess}
              autoFocus
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
            movieTitle={currentPuzzle.title}
            posterUrl={currentPuzzle.posterUrl}
            imdbId={currentPuzzle.imdbId}
            difficulty={state.revealedDifficulty}
            onNext={handleNext}
            isEndless
          />
        )}
      </div>
    </div>
  );
}
