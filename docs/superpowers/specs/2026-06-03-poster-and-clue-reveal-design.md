# Poster Size & Full Clue Reveal on Correct Guess — Design Spec

**Date:** 2026-06-03  
**Status:** Approved

## Changes

### 1. Bigger poster

**File:** `src/components/ResultOverlay.tsx`

Change the poster `<img>` height class from `h-44` (176px) to `h-72` (288px). No other changes to the result overlay.

### 2. Reveal all clues on correct guess

**Files:** `src/types/index.ts`, `src/hooks/useDailyPuzzle.ts`, `src/hooks/useEndlessGame.ts`, `src/components/ClueDisplay.tsx`, `src/pages/DailyPage.tsx`, `src/pages/EndlessPage.tsx`

**Why not just set `revealedDifficulty: 'easy'`:** `ResultOverlay` receives `difficulty={state.revealedDifficulty}` to display the badge and points earned. Forcing it to `'easy'` would incorrectly show "Easy · +1 pt" even for a Hard correct guess. The two concerns — which difficulty the player guessed on, and how many clues to show — must remain separate.

**Approach:** Add a `showAllClues` boolean field to `RoundState`. Set it to `true` on correct guess. `ClueDisplay` gets a `showAll?: boolean` prop; when true it shows all three cards regardless of `revealedDifficulty`. `revealedDifficulty` is never touched on a correct guess, so the badge and points stay accurate.

#### `src/types/index.ts`

Add `showAllClues: boolean` to `RoundState`:
```ts
export interface RoundState {
  revealedDifficulty: Difficulty;
  guesses: string[];
  result: GuessResult;
  showAllClues: boolean;
}
```

Update all initial state declarations (in `useDailyPuzzle` and `useEndlessGame`) to include `showAllClues: false`.

#### `src/hooks/useDailyPuzzle.ts`

In the correct-guess branch of `submitGuess`, change:
```ts
setState({ ...state, guesses: newGuesses, result: 'correct' });
```
to:
```ts
setState({ ...state, guesses: newGuesses, result: 'correct', showAllClues: true });
```

Also update the restore-from-saved-result `useEffect` to include `showAllClues: true` when restoring a correct result (so revisiting a solved puzzle still shows all clues):
```ts
setState({
  revealedDifficulty: DIFFICULTY_ORDER[Math.min(diffIndex, 2)],
  guesses: [],
  result: savedResult.result,
  showAllClues: savedResult.result === 'correct',
});
```

#### `src/hooks/useEndlessGame.ts`

In the correct-guess branch of `submitGuess`, change:
```ts
setState({ ...state, guesses: newGuesses, result: 'correct' });
```
to:
```ts
setState({ ...state, guesses: newGuesses, result: 'correct', showAllClues: true });
```

Also update initial state and the reset in `fetchNext` to include `showAllClues: false`.

#### `src/components/ClueDisplay.tsx`

Add `showAll?: boolean` to props. When `showAll` is `true`, treat every clue as shown:
```ts
const shown = showAll || i <= revealedIndex;
```

#### `src/pages/DailyPage.tsx` + `src/pages/EndlessPage.tsx`

Pass `showAll={state.showAllClues}` to `<ClueDisplay>`.

## What Does Not Change

- `revealedDifficulty` — never modified on correct guess; badge and points stay accurate
- Animation — `clue-entering` fires naturally for any card that transitions from hidden to shown
- Saved result / streak logic — unchanged
- Wrong-guess path — unchanged
