export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Clue {
  id: string;
  text: string;
  difficulty: Difficulty;
}

export interface Puzzle {
  puzzleNumber: number;
  movieId: string;
  title: string;
  normalizedTitle: string;
  altTitles: string[];
  posterUrl: string | null;
  clues: {
    hard: Clue;
    medium: Clue;
    easy: Clue;
  };
}

export type GuessResult = 'correct' | 'wrong' | 'unanswered';

export interface RoundState {
  revealedDifficulty: Difficulty;
  guesses: string[];
  result: GuessResult;
}

export interface DailyResult {
  date: string;
  puzzleNumber: number;
  result: GuessResult;
  guessCount: number;
  pointsEarned: number;
}

export interface StreakData {
  current: number;
  best: number;
  lastPlayedDate: string | null;
}
