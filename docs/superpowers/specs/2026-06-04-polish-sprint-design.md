# Double Take — Polish Sprint Design Spec

**Date:** 2026-06-04
**Status:** Approved
**Scope:** Four independent UX/UI improvements — IMDb link, year hint, dark mode, keyboard shortcuts

---

## Overview

Four focused improvements to the existing Double Take app. All changes are additive or extend existing patterns; none require schema migrations or new RPC calls beyond adding two columns to existing ones.

---

## 1. Shared Prerequisite — `Puzzle` Type & RPC Data

### Problem
`imdb_id` and `release_year` exist in the `movies` DB table but are not currently mapped into the `Puzzle` interface used by the frontend.

### Changes

**`src/types/index.ts`** — add two fields to `Puzzle`:
```ts
imdbId: string | null;
releaseYear: number | null;
```

**`src/hooks/useDailyPuzzle.ts`** — update the row-to-puzzle mapper:
```ts
imdbId: row.imdb_id ?? null,
releaseYear: row.release_year ?? null,
```

**`src/hooks/useEndlessGame.ts`** — same mapper update.

**Supabase RPCs** — `get_daily_puzzle` and `get_random_movie` must SELECT `imdb_id` and `release_year` from the `movies` table. If they do not already, add those columns to the SELECT list.

---

## 2. C1 — IMDb Link on Result Card

### Behaviour
- Rendered in `ResultOverlay` below the poster image when `imdbId` is non-null.
- Visible on both daily and endless result cards.
- Opens `https://www.imdb.com/title/{imdbId}` in a new tab.

### Component change — `ResultOverlay`
- Add `imdbId: string | null` to `Props`.
- Render after the poster `<img>`:
  ```tsx
  {imdbId && (
    <a
      href={`https://www.imdb.com/title/${imdbId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block text-xs text-slate-400 hover:text-slate-600 underline"
    >
      View on IMDb →
    </a>
  )}
  ```
- Pass `imdbId={puzzle.imdbId}` from both `DailyPage` and `EndlessPage`.

---

## 3. C2 — Year Hint Button

### Behaviour
- Appears between the clue list and the guess input when:
  - `revealedDifficulty === 'easy'` (all 3 clues visible), AND
  - `result === 'unanswered'` (game still in progress)
- A single tap reveals the release year inline; the button disappears.
- Resets when a new round starts (local state reset on `fetchNext` / new puzzle).
- Does **not** appear after game over — the result card already dominates at that point.

### State
Local `showYear: boolean` (default `false`) in both `DailyPage` and `EndlessPage`.

- In `EndlessPage`, `handleNext` must call `setShowYear(false)` explicitly before calling `fetchNext()`.
- In `DailyPage`, no reset is needed — there is only one puzzle per day and the page doesn't cycle.

### Render (both pages)
```tsx
{state.revealedDifficulty === 'easy' && state.result === 'unanswered' && (
  <div className="mt-3 text-center">
    {showYear ? (
      <p className="text-sm text-slate-500">
        Released: <span className="font-semibold text-slate-700">{puzzle.releaseYear}</span>
      </p>
    ) : (
      <button
        type="button"
        onClick={() => setShowYear(true)}
        className="text-xs text-slate-400 underline hover:text-slate-600"
      >
        Reveal year
      </button>
    )}
  </div>
)}
```

---

## 4. D1 — Dark Mode Toggle

### Behaviour
- Manual toggle via a moon/sun button in the header.
- Persists preference to `localStorage` under key `"dark-mode"`.
- Applied by adding/removing the `dark` class on `document.documentElement`.
- Respects the stored value on initial load (no flash).

### Tailwind config
`tailwind.config.js` must have:
```js
darkMode: 'class',
```

### `useDarkMode` hook — new file `src/hooks/useDarkMode.ts`
```ts
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('dark-mode') === 'true';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('dark-mode', String(isDark));
  }, [isDark]);

  return { isDark, toggleDarkMode: () => setIsDark((d) => !d) };
}
```

### Header button — `App.tsx`
Add `useDarkMode()` to `AppShell`. Add button to the `<nav>`:
```tsx
<button
  aria-label="toggle dark mode"
  onClick={toggleDarkMode}
  className="ml-1 rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
>
  {isDark ? '☀️' : '🌙'}
</button>
```

### Dark variants to add across components
Key surfaces and their dark overrides:

| Element | Light | Dark |
|---|---|---|
| Page background (`AppShell` wrapper) | `bg-slate-50` | `dark:bg-slate-900` |
| Header | `bg-white border-slate-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Clue cards | `bg-white border-slate-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Clue text | `text-slate-600` | `dark:text-slate-300` |
| Unrevealed clue | `bg-slate-50 border-slate-200` | `dark:bg-slate-900 dark:border-slate-700` |
| Stats modal backdrop | `bg-black/40` | unchanged |
| Stats modal panel | `bg-white border-slate-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Result overlay card | `bg-white border-slate-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Guess input | `border-slate-200 focus:border-slate-900` | `dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-slate-300` |
| Guess button | `bg-slate-900 text-white` | `dark:bg-slate-100 dark:text-slate-900` |
| Suggestion dropdown | `bg-white border-slate-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Nav active | `bg-slate-100 text-slate-900` | `dark:bg-slate-700 dark:text-white` |
| Wrong guess pill | `bg-white border-red-100 text-red-600` | `dark:bg-slate-800` |

---

## 5. D2 — Keyboard Shortcuts

### Three improvements

**1. Auto-focus input**
- Add `autoFocus?: boolean` prop to `GuessInput`.
- Apply `autoFocus` on the `<input>` element when the prop is true.
- Pass `autoFocus={!isDone && !alreadyPlayedToday}` from `DailyPage`.
- Pass `autoFocus={!isDone}` from `EndlessPage`.
- In `EndlessPage.handleNext`, after calling `fetchNext()`, the input re-mounts with `autoFocus` naturally.

**2. Escape clears input value**
- In `GuessInput.handleKeyDown`, after the existing Escape handling:
  ```ts
  } else if (e.key === 'Escape') {
    if (open) {
      setOpen(false);       // first press: close dropdown
    } else {
      onChange('');         // second press (or no dropdown): clear value
    }
  }
  ```

**3. Enter advances in endless mode**
- In `EndlessPage`, add a `useEffect`:
  ```ts
  useEffect(() => {
    if (!isDone) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') handleNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDone]);
  ```

---

## Build Order

1. Shared prerequisite (type + RPC mappers) — unblocks C1 and C2
2. C1 IMDb link — self-contained ResultOverlay change
3. C2 Year hint — self-contained page-level state change
4. D2 Keyboard shortcuts — self-contained GuessInput + EndlessPage change
5. D1 Dark mode — widest surface area, do last to avoid conflicts with earlier diffs

---

## Out of Scope

- No changes to Supabase DB schema (columns already exist)
- No new localStorage keys beyond `"dark-mode"`
- No changes to the share emoji output format
- No animation on the year reveal (plain show/hide)
