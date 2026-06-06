# UI Improvements — Stats Modal, Result Screen, Clue Animation

**Date:** 2026-06-02  
**Status:** Approved

---

## Overview

Three targeted improvements to the Double Take game UI, in priority order:

1. **Stats modal** — persistent game history with win rate and clue-level distribution
2. **Result screen polish** — animated win badge, confetti on Hard solves, Stats shortcut
3. **Clue unlock animation** — slide-down reveal when a new difficulty unlocks

---

## 1. Stats Modal

### Data model

Add a new `game-history` localStorage key alongside existing `streak` and `daily-result-{date}` keys. No existing keys are changed (backwards compatibility preserved).

```ts
// localStorage key: "game-history"
type GameHistoryEntry = {
  date: string          // "YYYY-MM-DD"
  result: 'hard' | 'medium' | 'easy' | 'miss'
  puzzleNumber: number
}
type GameHistory = GameHistoryEntry[]
```

A new entry is appended every time a daily puzzle ends (win or loss). Endless mode does not write to this history.

### `useStats` hook

New hook at `src/hooks/useStats.ts`. Reads `game-history` from localStorage via `useLocalStorage` and computes derived values:

```ts
type Stats = {
  played: number
  winRate: number        // 0–100
  currentStreak: number
  bestStreak: number
  distribution: {
    hard: number
    medium: number
    easy: number
    miss: number
  }
}
```

Streak values are sourced from the existing `streak` localStorage key (already maintained by `useDailyPuzzle`). `played` and `distribution` are derived from `game-history`. `winRate` = `(played - miss) / played * 100`, rounded.

### `StatsModal` component

New component at `src/components/StatsModal.tsx`.

**Layout:**
- Four summary numbers in a row: Played / Win % / 🔥 Streak / Best
- Horizontal distribution bars for 🔴 Hard / 🟡 Medium / 🟢 Easy / ✗ Miss
  - Each bar's width is proportional to its share of total games played
  - Count shown inside or beside each bar
- Close button (×) top-right; clicking backdrop also closes

**Triggers (two entry points):**
1. `📊` icon button in the app header (always visible, both pages)
2. "📊 Stats" button in `ResultOverlay` (appears after every daily round)

**State:** Modal open/closed state lives in `App.tsx` as `statsOpen: boolean`. Passed down as props. No context needed.

### Changes to existing files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `📊` icon button to header; add `statsOpen` state; render `<StatsModal>` |
| `src/components/ResultOverlay.tsx` | Add "📊 Stats" button next to Share; accepts `onShowStats` prop |
| `src/hooks/useDailyPuzzle.ts` | On game end, append entry to `game-history` via `useLocalStorage` |
| `src/pages/DailyPage.tsx` | Pass `onShowStats` callback down to `ResultOverlay` |

---

## 2. Result Screen Polish

### Win badge

Replace the plain `"Correct! +X pts"` text in `ResultOverlay` with a styled pill badge:

```
🟢 Easy · +1 pt      (green background)
🟡 Medium · +2 pts   (amber background)
🔴 Hard · +3 pts     (red background)
```

The badge uses a CSS bounce-in animation:
```css
@keyframes badgePop {
  0%   { transform: scale(0.8); opacity: 0; }
  60%  { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
/* applied with: animation: badgePop 0.3s ease-out both */
```

The result overlay background tints subtly to match the clue colour (green/amber/red) on win, remains neutral on loss.

### Confetti

Install `canvas-confetti` (~3 KB gzip):
```
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

Confetti fires **only on Hard solves**. It is not shown for Medium, Easy, or incorrect results.

```ts
// fires from bottom-center, bursting upward
confetti({
  particleCount: 120,
  spread: 70,
  origin: { x: 0.5, y: 1 },
  colors: ['#dc2626', '#f59e0b', '#16a34a', '#3b82f6', '#8b5cf6'],
})
```

Called inside `ResultOverlay` via a `useEffect` that runs once when the component mounts with `result === 'correct' && clueLevel === 'hard'`.

### "📊 Stats" button

Added to `ResultOverlay` alongside the existing Share button. Only rendered in Daily mode (not Endless). Calls `onShowStats` prop.

---

## 3. Clue Unlock Animation

### Behaviour

When `revealedDifficulty` advances (hard→medium or medium→easy), the newly revealed clue card slides in from above with a fade. The previously shown clues do not re-animate.

### Implementation

In `ClueDisplay.tsx`:

```css
@keyframes clueSlideDown {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.clue-entering {
  animation: clueSlideDown 0.35s ease-out both;
}
```

Track which difficulty was most recently revealed using a `useRef<string>`. On each render, compare current `revealedDifficulty` to the ref. If it advanced, the new clue's wrapper div receives the `clue-entering` class. The ref is then updated to the new value.

The animation class is applied via a stable React `key` on the revealed clue's container — changing the key when a new clue unlocks forces React to remount that element, replaying the animation cleanly without needing manual class toggling.

---

## File Summary

**New files:**
- `src/hooks/useStats.ts`
- `src/components/StatsModal.tsx`

**Modified files:**
- `src/App.tsx` — header icon, modal state, modal render
- `src/components/ResultOverlay.tsx` — badge, confetti, Stats button
- `src/components/ClueDisplay.tsx` — slide-down animation
- `src/hooks/useDailyPuzzle.ts` — append to game-history on round end
- `src/pages/DailyPage.tsx` — pass onShowStats to ResultOverlay
- `src/types/index.ts` — add `GameHistoryEntry` and `Stats` types
- `package.json` — add `canvas-confetti` dependency

---

## Out of scope

- Endless mode stats (session score only, no persistence)
- Animated confetti on Medium/Easy wins
- Stats reset / clear history button
- Server-side stats or leaderboards
