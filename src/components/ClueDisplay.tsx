import type { Difficulty, Clue } from '../types';

const LABELS: Record<Difficulty, string> = {
  hard: '🔴 Hard',
  medium: '🟡 Medium',
  easy: '🟢 Easy',
};

const ORDER: Difficulty[] = ['hard', 'medium', 'easy'];

interface Props {
  clues: { hard: Clue; medium: Clue; easy: Clue };
  revealedDifficulty: Difficulty;
}

export function ClueDisplay({ clues, revealedDifficulty }: Props) {
  const revealedIndex = ORDER.indexOf(revealedDifficulty);

  return (
    <div className="space-y-3">
      {ORDER.map((diff, i) => {
        const shown = i <= revealedIndex;
        return (
          <div
            key={`${diff}-${shown}`}
            className={`rounded-lg border p-4 ${
              shown
                ? 'clue-entering border-gray-200 bg-white shadow-sm'
                : 'border-dashed border-gray-200 bg-gray-50 opacity-40'
            }`}
          >
            <div className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
              {LABELS[diff]}
            </div>
            {shown ? (
              <p className="text-gray-800 leading-relaxed">{clues[diff].text}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Reveal by guessing incorrectly
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
