import type { Difficulty, Clue } from '../types';

const LABELS: Record<Difficulty, string> = {
  hard:   'Hard',
  medium: 'Medium',
  easy:   'Easy',
};

const BADGE_CLASSES: Record<Difficulty, string> = {
  hard:   'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  easy:   'bg-green-50 text-green-700',
};

const BORDER_CLASSES: Record<Difficulty, string> = {
  hard:   'border-l-red-500',
  medium: 'border-l-amber-400',
  easy:   'border-l-green-500',
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
            className={
              shown
                ? `clue-entering rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${BORDER_CLASSES[diff]}`
                : 'rounded-xl border border-dashed border-slate-200 border-l-4 border-l-slate-200 bg-slate-50 p-4 opacity-40'
            }
          >
            <div
              className={`mb-2.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                shown ? BADGE_CLASSES[diff] : 'bg-slate-100 text-slate-400'
              }`}
            >
              {LABELS[diff]}
            </div>
            {shown ? (
              <p className="text-sm leading-relaxed text-slate-600">{clues[diff].text}</p>
            ) : (
              <p className="text-sm italic text-slate-400">
                Reveal by guessing incorrectly
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
