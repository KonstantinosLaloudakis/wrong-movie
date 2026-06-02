import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isCorrectGuess } from '../lib/guessMatch';
import type { Puzzle, RoundState, Difficulty } from '../types';

const DIFFICULTY_ORDER: Difficulty[] = ['hard', 'medium', 'easy'];
const POINTS_MAP: Record<Difficulty, number> = { hard: 3, medium: 2, easy: 1 };

export function useEndlessGame() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [playedIds, setPlayedIds] = useState<string[]>([]);
  const [state, setState] = useState<RoundState>({
    revealedDifficulty: 'hard',
    guesses: [],
    result: 'unanswered',
    showAllClues: false,
  });
  const [movieTitles, setMovieTitles] = useState<string[]>([]);

  useEffect(() => {
    supabase.rpc('get_movie_titles').then(({ data }) => {
      if (data) setMovieTitles((data as { title: string }[]).map((r) => r.title));
    });
  }, []);

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setPuzzle(null);
    setState({ revealedDifficulty: 'hard', guesses: [], result: 'unanswered', showAllClues: false });

    const { data, error } = await supabase.rpc('get_random_movie', {
      excluded_ids: playedIds,
    });

    try {
      if (error || !data?.length) {
        return;
      }

      const row = data[0];
      setPuzzle({
        puzzleNumber: 0, // not applicable in endless mode
        movieId: row.movie_id,
        title: row.title,
        normalizedTitle: row.normalized_title,
        altTitles: row.alt_titles ?? [],
        posterUrl: row.poster_url ?? null,
        clues: {
          hard: { id: '', text: row.hard_clue, difficulty: 'hard' },
          medium: { id: '', text: row.medium_clue, difficulty: 'medium' },
          easy: { id: '', text: row.easy_clue, difficulty: 'easy' },
        },
      });
      setPlayedIds((prev) => [...prev, row.movie_id]);
    } finally {
      setLoading(false);
    }
  }, [playedIds]);

  function submitGuess(guess: string): boolean {
    if (!puzzle || state.result !== 'unanswered') return false;

    const correct = isCorrectGuess(
      guess,
      puzzle.normalizedTitle,
      puzzle.altTitles
    );
    const newGuesses = [...state.guesses, guess];
    const currentIndex = DIFFICULTY_ORDER.indexOf(state.revealedDifficulty);

    if (correct) {
      setSessionScore((s) => s + POINTS_MAP[state.revealedDifficulty]);
      setState({ ...state, guesses: newGuesses, result: 'correct', showAllClues: true });
      return true;
    } else if (currentIndex < DIFFICULTY_ORDER.length - 1) {
      setState({
        guesses: newGuesses,
        revealedDifficulty: DIFFICULTY_ORDER[currentIndex + 1],
        result: 'unanswered',
        showAllClues: false,
      });
      return false;
    } else {
      setState({ ...state, guesses: newGuesses, result: 'wrong' });
      return false;
    }
  }

  return { puzzle, loading, sessionScore, state, fetchNext, submitGuess, movieTitles };
}
