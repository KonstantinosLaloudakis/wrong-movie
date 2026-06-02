# Poster Size & Full Clue Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase the result poster to `h-72` and reveal all three clue cards (with animation) when the player guesses correctly, without affecting the difficulty badge or points display.

**Architecture:** Two independent changes. The poster is a one-line Tailwind class change in `ResultOverlay`. The clue reveal adds `showAllClues: boolean` to `RoundState` — set to `true` on correct guess in both hooks — and passes it as `showAll` to `ClueDisplay`, which uses it to override the per-difficulty reveal logic.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, @testing-library/react

---

## File Map

| Action | File | Change |
|---|---|---|
| Modify | `src/components/ResultOverlay.tsx` | `h-44` → `h-72` on poster image |
| Modify | `src/types/index.ts` | Add `showAllClues: boolean` to `RoundState` |
| Modify | `src/hooks/useDailyPuzzle.ts` | `showAllClues: false` in initial/reset state; `showAllClues: true` on correct guess; restore from saved result |
| Modify | `src/hooks/useEndlessGame.ts` | Same: initial/reset + correct guess |
| Modify | `src/components/ClueDisplay.tsx` | Add `showAll?: boolean` prop, override reveal logic |
| Create | `src/components/ClueDisplay.test.tsx` | Test `showAll` prop behavior |
| Modify | `src/pages/DailyPage.tsx` | Pass `showAll={state.showAllClues}` to `<ClueDisplay>` |
| Modify | `src/pages/EndlessPage.tsx` | Pass `showAll={state.showAllClues}` to `<ClueDisplay>` |

---

## Task 1: Bigger poster

**Files:**
- Modify: `src/components/ResultOverlay.tsx`

- [ ] **Step 1.1 — Change poster height**

In `src/components/ResultOverlay.tsx`, find the `<img>` element and change `h-44` to `h-72`:

```tsx
// Before
className="mx-auto mt-3 h-44 w-auto rounded object-cover shadow"

// After
className="mx-auto mt-3 h-72 w-auto rounded object-cover shadow"
```

- [ ] **Step 1.2 — Run tests**

```
npx tsc --noEmit
npx vitest run
```

Expected: zero errors, all tests pass.

- [ ] **Step 1.3 — Commit**

```bash
git add src/components/ResultOverlay.tsx
git commit -m "feat: increase movie poster size to h-72 in ResultOverlay"
```

---

## Task 2: Reveal all clues on correct guess

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/hooks/useDailyPuzzle.ts`
- Modify: `src/hooks/useEndlessGame.ts`
- Modify: `src/components/ClueDisplay.tsx`
- Create: `src/components/ClueDisplay.test.tsx`
- Modify: `src/pages/DailyPage.tsx`
- Modify: `src/pages/EndlessPage.tsx`

- [ ] **Step 2.1 — Add `showAllClues` to `RoundState` in `src/types/index.ts`**

Find the `RoundState` interface:
```ts
export interface RoundState {
  revealedDifficulty: Difficulty;
  guesses: string[];
  result: GuessResult;
}
```

Replace with:
```ts
export interface RoundState {
  revealedDifficulty: Difficulty;
  guesses: string[];
  result: GuessResult;
  showAllClues: boolean;
}
```

- [ ] **Step 2.2 — Write failing test for `ClueDisplay` `showAll` prop**

Create `src/components/ClueDisplay.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClueDisplay } from './ClueDisplay';
import type { Clue } from '../types';

const clues = {
  hard:   { id: '1', text: 'Hard clue text',   difficulty: 'hard'   } as Clue,
  medium: { id: '2', text: 'Medium clue text', difficulty: 'medium' } as Clue,
  easy:   { id: '3', text: 'Easy clue text',   difficulty: 'easy'   } as Clue,
};

describe('ClueDisplay', () => {
  it('shows only the hard clue when revealedDifficulty is hard', () => {
    render(<ClueDisplay clues={clues} revealedDifficulty="hard" showAll={false} />);
    expect(screen.getByText('Hard clue text')).toBeInTheDocument();
    expect(screen.queryByText('Medium clue text')).not.toBeInTheDocument();
    expect(screen.queryByText('Easy clue text')).not.toBeInTheDocument();
  });

  it('shows all clues when showAll is true, regardless of revealedDifficulty', () => {
    render(<ClueDisplay clues={clues} revealedDifficulty="hard" showAll={true} />);
    expect(screen.getByText('Hard clue text')).toBeInTheDocument();
    expect(screen.getByText('Medium clue text')).toBeInTheDocument();
    expect(screen.getByText('Easy clue text')).toBeInTheDocument();
  });

  it('shows all clues when showAll is true even with medium revealed', () => {
    render(<ClueDisplay clues={clues} revealedDifficulty="medium" showAll={true} />);
    expect(screen.getByText('Hard clue text')).toBeInTheDocument();
    expect(screen.getByText('Medium clue text')).toBeInTheDocument();
    expect(screen.getByText('Easy clue text')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2.3 — Run tests, confirm they fail**

```
npx vitest run src/components/ClueDisplay.test.tsx
```

Expected: FAIL — `ClueDisplay` does not accept `showAll` prop yet.

- [ ] **Step 2.4 — Update `ClueDisplay` to accept `showAll` prop**

Replace the entire contents of `src/components/ClueDisplay.tsx`:

```tsx
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
  showAll?: boolean;
}

export function ClueDisplay({ clues, revealedDifficulty, showAll = false }: Props) {
  const revealedIndex = ORDER.indexOf(revealedDifficulty);

  return (
    <div className="space-y-3">
      {ORDER.map((diff, i) => {
        const shown = showAll || i <= revealedIndex;
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
```

- [ ] **Step 2.5 — Run ClueDisplay tests, confirm they pass**

```
npx vitest run src/components/ClueDisplay.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 2.6 — Update `useDailyPuzzle.ts`**

In `src/hooks/useDailyPuzzle.ts`, make three changes:

**Change A** — Initial state (around line 27):
```ts
// Before
const [state, setState] = useState<RoundState>({
  revealedDifficulty: 'hard',
  guesses: [],
  result: 'unanswered',
});

// After
const [state, setState] = useState<RoundState>({
  revealedDifficulty: 'hard',
  guesses: [],
  result: 'unanswered',
  showAllClues: false,
});
```

**Change B** — Restore from saved result `useEffect` (around line 54):
```ts
// Before
setState({
  revealedDifficulty: DIFFICULTY_ORDER[Math.min(diffIndex, 2)],
  guesses: [],
  result: savedResult.result,
});

// After
setState({
  revealedDifficulty: DIFFICULTY_ORDER[Math.min(diffIndex, 2)],
  guesses: [],
  result: savedResult.result,
  showAllClues: savedResult.result === 'correct',
});
```

**Change C** — Correct-guess branch in `submitGuess` (around line 132):
```ts
// Before
setState({ ...state, guesses: newGuesses, result: 'correct' });

// After
setState({ ...state, guesses: newGuesses, result: 'correct', showAllClues: true });
```

- [ ] **Step 2.7 — Update `useEndlessGame.ts`**

In `src/hooks/useEndlessGame.ts`, make three changes:

**Change A** — Initial state (around line 14):
```ts
// Before
const [state, setState] = useState<RoundState>({
  revealedDifficulty: 'hard',
  guesses: [],
  result: 'unanswered',
});

// After
const [state, setState] = useState<RoundState>({
  revealedDifficulty: 'hard',
  guesses: [],
  result: 'unanswered',
  showAllClues: false,
});
```

**Change B** — Reset in `fetchNext` (around line 30):
```ts
// Before
setState({ revealedDifficulty: 'hard', guesses: [], result: 'unanswered' });

// After
setState({ revealedDifficulty: 'hard', guesses: [], result: 'unanswered', showAllClues: false });
```

**Change C** — Correct-guess branch in `submitGuess` (around line 74):
```ts
// Before
setState({ ...state, guesses: newGuesses, result: 'correct' });

// After
setState({ ...state, guesses: newGuesses, result: 'correct', showAllClues: true });
```

- [ ] **Step 2.8 — Run full test suite, confirm no TypeScript errors**

```
npx tsc --noEmit
npx vitest run
```

Expected: zero errors. The new `showAllClues` field on `RoundState` will cause TypeScript errors in DailyPage and EndlessPage until Step 2.9 — if errors appear only in those two files, that's expected; fix them in the next step.

- [ ] **Step 2.9 — Wire `showAll` in `DailyPage.tsx` and `EndlessPage.tsx`**

In `src/pages/DailyPage.tsx`, find the `<ClueDisplay>` call and add the `showAll` prop:

```tsx
// Before
<ClueDisplay
  clues={puzzle.clues}
  revealedDifficulty={state.revealedDifficulty}
/>

// After
<ClueDisplay
  clues={puzzle.clues}
  revealedDifficulty={state.revealedDifficulty}
  showAll={state.showAllClues}
/>
```

In `src/pages/EndlessPage.tsx`, find the `<ClueDisplay>` call and add the `showAll` prop:

```tsx
// Before
<ClueDisplay
  clues={puzzle.clues}
  revealedDifficulty={state.revealedDifficulty}
/>

// After
<ClueDisplay
  clues={puzzle.clues}
  revealedDifficulty={state.revealedDifficulty}
  showAll={state.showAllClues}
/>
```

- [ ] **Step 2.10 — Run full test suite**

```
npx tsc --noEmit
npx vitest run
```

Expected: zero TypeScript errors, all tests pass.

- [ ] **Step 2.11 — Commit**

```bash
git add src/types/index.ts src/hooks/useDailyPuzzle.ts src/hooks/useEndlessGame.ts src/components/ClueDisplay.tsx src/components/ClueDisplay.test.tsx src/pages/DailyPage.tsx src/pages/EndlessPage.tsx
git commit -m "feat: reveal all clues on correct guess with slide-in animation"
```
