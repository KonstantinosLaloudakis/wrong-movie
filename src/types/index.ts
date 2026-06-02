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

export type GameResultType = 'hard' | 'medium' | 'easy' | 'miss';

export interface GameHistoryEntry {
  date: string;          // "YYYY-MM-DD"
  result: GameResultType;
  puzzleNumber: number;
}

export type GameHistory = GameHistoryEntry[];

export interface Stats {
  played: number;
  winRate: number;       // 0–100, rounded
  currentStreak: number;
  bestStreak: number;
  distribution: {
    hard: number;
    medium: number;
    easy: number;
    miss: number;
  };
}
