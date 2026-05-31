import { useState } from 'react';
import type { Difficulty, GuessResult } from '../types';

const CLUE_TRAIL: Record<Difficulty, string> = {
  hard: '🟢⬜⬜',
  medium: '🔴🟢⬜',
  easy: '🔴🔴🟢',
};

function buildShareText(
  puzzleNumber: number,
  result: GuessResult,
  difficulty: Difficulty
): string {
  const dots = result === 'correct' ? CLUE_TRAIL[difficulty] : '🔴🔴🔴';
  return `Wrong Movie 🎬 #${puzzleNumber}\n${dots}\nwrongmovie.github.io`;
}

interface Props {
  puzzleNumber: number;
  result: GuessResult;
  revealedDifficulty: Difficulty;
}

export function ShareButton({ puzzleNumber, result, revealedDifficulty }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const text = buildShareText(puzzleNumber, result, revealedDifficulty);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
    >
      {copied ? '✓ Copied to clipboard!' : '📋 Share result'}
    </button>
  );
}
