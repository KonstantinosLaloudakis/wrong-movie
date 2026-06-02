import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isCorrectGuess } from '../lib/guessMatch';
import { useLocalStorage } from './useLocalStorage';
import type {
  Puzzle,
  RoundState,
  DailyResult,
  StreakData,
  Difficulty,
  GameHistory,
  GameResultType,
} from '../types';

const DIFFICULTY_ORDER: Difficulty[] = ['hard', 'medium', 'easy'];
const POINTS_MAP: Record<Difficulty, number> = { hard: 3, medium: 2, easy: 1 };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useDailyPuzzle() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movieTitles, setMovieTitles] = useState<string[]>([]);
  const [state, setState] = useState<RoundState>({
    revealedDifficulty: 'hard',
    guesses: [],
    result: 'unanswered',
    showAllClues: false,
  });

  const [savedResult, setSavedResult] = useLocalStorage<DailyResult | null>(
    `daily-result-${todayStr()}`,
    null
  );
  const [streak, setStreak] = useLocalStorage<StreakData>('streak', {
    current: 0,
    best: 0,
    lastPlayedDate: null,
  });
  const [, setGameHistory] = useLocalStorage<GameHistory>(
    'game-history',
    []
  );

  useEffect(() => {
    fetchDailyPuzzle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!puzzle || !savedResult) return;
    const diffIndex = savedResult.guessCount - 1;
    setState({
      revealedDifficulty: DIFFICULTY_ORDER[Math.min(diffIndex, 2)],
      guesses: [], // guesses are not persisted — see DailyResult type
      result: savedResult.result,
      showAllClues: savedResult.result === 'correct',
    });
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [puzzle]); // intentionally excludes savedResult — only restore once when puzzle first loads

  async function fetchDailyPuzzle() {
    setLoading(true);
    setError(null);

    const [titlesResult, puzzleResult] = await Promise.all([
      supabase.rpc('get_movie_titles'),
      supabase.rpc('get_daily_puzzle', { p_date: todayStr() }),
    ]);

    if (titlesResult.data) {
      setMovieTitles(
        (titlesResult.data as { title: string }[]).map((r) => r.title)
      );
    }

    const { data, error: err } = puzzleResult;

    if (err || !data?.length) {
      setError('No puzzle available for today. Check back tomorrow!');
      setLoading(false);
      return;
    }

    const row = data[0];
    setPuzzle({
      puzzleNumber: row.puzzle_number,
      movieId: row.movie_id,
      title: row.title,
      normalizedTitle: row.normalized_title,
      altTitles: row.alt_titles ?? [],
      posterUrl: row.poster_url ?? null,
      clues: {
        hard: { id: row.clue_hard_id, text: row.hard_clue, difficulty: 'hard' },
        medium: { id: row.clue_medium_id, text: row.medium_clue, difficulty: 'medium' },
        easy: { id: row.clue_easy_id, text: row.easy_clue, difficulty: 'easy' },
      },
    });

    setLoading(false);
  }

  function appendHistory(result: GameResultType, puzzleNumber: number) {
    setGameHistory((prev) => {
      if (prev.some((e) => e.date === todayStr())) return prev; // idempotent
      return [...prev, { date: todayStr(), result, puzzleNumber }];
    });
  }

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
      const points = POINTS_MAP[state.revealedDifficulty];
      setSavedResult({
        date: todayStr(),
        puzzleNumber: puzzle.puzzleNumber,
        result: 'correct',
        guessCount: newGuesses.length,
        pointsEarned: points,
      });
      updateStreak(true);
      appendHistory(state.revealedDifficulty, puzzle.puzzleNumber);
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
      setSavedResult({
        date: todayStr(),
        puzzleNumber: puzzle.puzzleNumber,
        result: 'wrong',
        guessCount: newGuesses.length,
        pointsEarned: 0,
      });
      updateStreak(false);
      appendHistory('miss', puzzle.puzzleNumber);
      setState({ ...state, guesses: newGuesses, result: 'wrong' });
      return false;
    }
  }

  function updateStreak(won: boolean) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    setStreak((prev) => {
      if (prev.lastPlayedDate === todayStr()) return prev; // already updated today
      const consecutive =
        won && prev.lastPlayedDate === yesterdayStr
          ? prev.current + 1
          : won
          ? 1
          : 0;
      return {
        current: consecutive,
        best: Math.max(prev.best, consecutive),
        lastPlayedDate: todayStr(),
      };
    });
  }

  return { puzzle, loading, error, state, savedResult, streak, submitGuess, refetch: fetchDailyPuzzle, movieTitles };
}
