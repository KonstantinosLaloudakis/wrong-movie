import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isCorrectGuess } from '../lib/guessMatch';
import { useLocalStorage } from './useLocalStorage';
import type { Puzzle, RoundState, Difficulty, GameResultType, SpotlightResult } from '../types';
import type { SpotlightConfig } from '../config/spotlights';

const DIFFICULTY_ORDER: Difficulty[] = ['hard', 'medium', 'easy'];
const POINTS_WITH_MISS: Record<GameResultType, number> = { hard: 3, medium: 2, easy: 1, miss: 0 };
const OUTCOME_EMOJI: Record<GameResultType, string> = {
  hard: '🟢', medium: '🟡', easy: '🟡', miss: '🔴',
};

export function buildSpotlightShareText(
  name: string,
  score: number,
  maxScore: number,
  outcomes: GameResultType[]
): string {
  const emojiRow = outcomes.map(o => OUTCOME_EMOJI[o]).join('');
  return `🎬 ${name} Spotlight\n${score}/${maxScore} · wrongmovie.app\n${emojiRow}`;
}

export function useSpotlightGame(spotlight: SpotlightConfig) {
  const [movies, setMovies] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundOutcomes, setRoundOutcomes] = useState<GameResultType[]>([]);
  const [state, setState] = useState<RoundState>({
    revealedDifficulty: 'hard',
    guesses: [],
    result: 'unanswered',
    showAllClues: false,
  });

  const [, saveResult] = useLocalStorage<SpotlightResult | null>(
    `spotlight-result-${spotlight.id}`,
    null
  );

  const isComplete = movies.length > 0 && currentIndex >= movies.length;

  const sessionScore = roundOutcomes.reduce((sum, o) => sum + POINTS_WITH_MISS[o], 0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params: { p_actor_id?: string; p_director_name?: string } = {};
      if (spotlight.type === 'actor' && spotlight.actorId) {
        params.p_actor_id = spotlight.actorId;
      } else if (spotlight.type === 'director' && spotlight.directorName) {
        params.p_director_name = spotlight.directorName;
      }
      const { data } = await supabase.rpc('get_spotlight_movies', params);
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMovies(
          (data as any[]).map(row => ({
            puzzleNumber: 0,
            movieId: row.movie_id,
            title: row.title,
            normalizedTitle: row.normalized_title,
            altTitles: row.alt_titles ?? [],
            posterUrl: row.poster_url ?? null,
            imdbId: row.imdb_id ?? null,
            releaseYear: row.release_year ?? null,
            clues: {
              hard:   { id: '', text: row.hard_clue,   difficulty: 'hard'   as Difficulty },
              medium: { id: '', text: row.medium_clue, difficulty: 'medium' as Difficulty },
              easy:   { id: '', text: row.easy_clue,   difficulty: 'easy'   as Difficulty },
            },
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, [spotlight.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isComplete || roundOutcomes.length === 0) return;
    saveResult({
      score: sessionScore,
      maxScore: movies.length * 3,
      completedAt: new Date().toISOString(),
      perMovie: roundOutcomes,
    });
  }, [isComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  function submitGuess(guess: string): boolean {
    const puzzle = movies[currentIndex];
    if (!puzzle || state.result !== 'unanswered') return false;

    const correct = isCorrectGuess(guess, puzzle.normalizedTitle, puzzle.altTitles);
    const newGuesses = [...state.guesses, guess];
    const diffIndex = DIFFICULTY_ORDER.indexOf(state.revealedDifficulty);

    if (correct) {
      setState({ ...state, guesses: newGuesses, result: 'correct', showAllClues: true });
      return true;
    } else if (diffIndex < DIFFICULTY_ORDER.length - 1) {
      setState({
        guesses: newGuesses,
        revealedDifficulty: DIFFICULTY_ORDER[diffIndex + 1],
        result: 'unanswered',
        showAllClues: false,
      });
      return false;
    } else {
      setState({ ...state, guesses: newGuesses, result: 'wrong', showAllClues: false });
      return false;
    }
  }

  function advance() {
    if (state.result === 'unanswered') return;
    const outcome: GameResultType =
      state.result === 'correct' ? state.revealedDifficulty : 'miss';
    setRoundOutcomes(prev => [...prev, outcome]);
    setCurrentIndex(prev => prev + 1);
    setState({ revealedDifficulty: 'hard', guesses: [], result: 'unanswered', showAllClues: false });
  }

  return {
    movies,
    loading,
    currentIndex,
    currentPuzzle: movies[currentIndex] ?? null,
    state,
    sessionScore,
    totalMovies: movies.length,
    roundOutcomes,
    isComplete,
    submitGuess,
    advance,
    movieTitles: movies.map(m => m.title),
  };
}
