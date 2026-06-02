# Endless Mode Stats — Design Spec

**Date:** 2026-06-03

## Summary

Add persistent statistics for endless mode, displayed in a tabbed version of the existing Stats modal. Daily and endless stats are tracked and displayed separately.

---

## Data & Storage

Two new types added to `src/types/index.ts`:

```ts
export interface EndlessHistoryEntry {
  result: GameResultType;   // 'hard' | 'medium' | 'easy' | 'miss'
  playedAt: string;         // ISO timestamp
}
export type EndlessHistory = EndlessHistoryEntry[];

export interface EndlessStats {
  played: number;
  winRate: number;          // 0–100, rounded
  distribution: { hard: number; medium: number; easy: number; miss: number };
}
```

Stored in localStorage under key `endless-history`. The existing `game-history` and `streak` keys are untouched.

---

## Hooks

### New: `src/hooks/useEndlessStats.ts`

- Reads `endless-history` from localStorage via `useLocalStorage`
- Computes `EndlessStats` (same pattern as `computeStats` but without streak fields)
- Exposes `saveEndlessResult(result: GameResultType) => void` which appends a new `EndlessHistoryEntry` to the stored history

### Modified: `src/hooks/useEndlessGame.ts`

- Imports and calls `saveEndlessResult` internally when a round ends:
  - Correct guess → result is the clue difficulty at time of correct guess (`'hard'`, `'medium'`, or `'easy'`)
  - Final wrong guess → result is `'miss'`
- `saveEndlessResult` is not exposed in the hook's return value

---

## UI

### Modified: `src/components/StatsModal.tsx`

- Accepts new prop `endlessStats: EndlessStats`
- Adds local state `tab: 'daily' | 'endless'` (defaults to `'daily'`)
- Replaces the "Statistics" heading with a two-button tab toggle: **Daily** / **Endless**
- Daily tab: renders exactly as today (Played, Win %, Streak, Best Streak, distribution)
- Endless tab: renders same layout with two stat tiles only (Played, Win %) and the distribution bars — no streak columns

### Modified: `src/App.tsx`

- Calls `useEndlessStats()` and passes `endlessStats` to `StatsModal`

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `EndlessHistoryEntry`, `EndlessHistory`, `EndlessStats` |
| `src/hooks/useEndlessStats.ts` | New file |
| `src/hooks/useEndlessGame.ts` | Call `saveEndlessResult` on round end |
| `src/components/StatsModal.tsx` | Add tab toggle, endless tab view |
| `src/App.tsx` | Wire up `useEndlessStats`, pass to modal |

---

## Out of Scope

- No server-side stat storage (localStorage only)
- No high score / session score tracking in stats
- No migration of existing endless session scores
