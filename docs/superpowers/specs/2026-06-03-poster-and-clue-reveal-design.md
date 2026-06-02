# Poster Size & Full Clue Reveal on Correct Guess — Design Spec

**Date:** 2026-06-03  
**Status:** Approved

## Changes

### 1. Bigger poster

**File:** `src/components/ResultOverlay.tsx`

Change the poster `<img>` height class from `h-44` (176px) to `h-72` (288px). No other changes to the result overlay.

### 2. Reveal all clues on correct guess

**Files:** `src/hooks/useDailyPuzzle.ts`, `src/hooks/useEndlessGame.ts`

When a player guesses correctly, set `revealedDifficulty: 'easy'` in the resulting state (instead of keeping the current difficulty). This causes `ClueDisplay` to show all three clue cards, with the `clue-entering` animation firing naturally for any card that transitions from hidden to shown.

**In `useDailyPuzzle.submitGuess`**, the correct-guess branch currently does:
```ts
setState({ ...state, guesses: newGuesses, result: 'correct' });
```
Change to:
```ts
setState({ ...state, guesses: newGuesses, result: 'correct', revealedDifficulty: 'easy' });
```

**In `useEndlessGame.submitGuess`**, the correct-guess branch currently does:
```ts
setState({ ...state, guesses: newGuesses, result: 'correct' });
```
Change to:
```ts
setState({ ...state, guesses: newGuesses, result: 'correct', revealedDifficulty: 'easy' });
```

## What Does Not Change

- `ClueDisplay` — no changes needed; it already shows all clues when `revealedDifficulty === 'easy'`
- Animation — the existing `clue-entering` slide-down fires automatically for newly revealed cards
- Saved result / streak logic — unchanged
- Wrong-guess path — unchanged
