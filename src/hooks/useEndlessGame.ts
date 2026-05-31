import { useCallback, useState } from 'react';
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
  });

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setState({ revealedDifficulty: 'hard', guesses: [], result: 'unanswered' });

    const { data, error } = await supabase.rpc('get_random_movie', {
      excluded_ids: playedIds,
    });

    if (error || !data?.length) {
      setPuzzle(null);
      setLoading(false);
      return;
    }

    const row = data[0];
    setPuzzle({
      puzzleNumber: 0,
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
    setLoading(false);
  }, [playedIds]);

  function submitGuess(guess: string) {
    if (!puzzle || state.result !== 'unanswered') return;

    const correct = isCorrectGuess(
      guess,
      puzzle.normalizedTitle,
      puzzle.altTitles
    );
    const newGuesses = [...state.guesses, guess];
    const currentIndex = DIFFICULTY_ORDER.indexOf(state.revealedDifficulty);

    if (correct) {
      setSessionScore((s) => s + POINTS_MAP[state.revealedDifficulty]);
      setState({ ...state, guesses: newGuesses, result: 'correct' });
    } else if (currentIndex < DIFFICULTY_ORDER.length - 1) {
      setState({
        guesses: newGuesses,
        revealedDifficulty: DIFFICULTY_ORDER[currentIndex + 1],
        result: 'unanswered',
      });
    } else {
      setState({ ...state, guesses: newGuesses, result: 'wrong' });
    }
  }

  return { puzzle, loading, sessionScore, state, fetchNext, submitGuess };
}
