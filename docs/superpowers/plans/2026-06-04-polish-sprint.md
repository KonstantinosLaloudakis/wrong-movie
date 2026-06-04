# Polish Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four independent UX/UI improvements — IMDb link on result card, year hint button, dark mode toggle, and keyboard shortcut polish.

**Architecture:** All changes are additive. Tasks share one prerequisite (two new fields on `Puzzle`), then fan out independently. Dark mode is done last as it touches the most files. Each task produces working, committable software on its own.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Vitest + Testing Library (jsdom), Supabase RPCs

---

## File Map

| File | Action | Reason |
|---|---|---|
| `src/types/index.ts` | Modify | Add `imdbId`, `releaseYear` to `Puzzle` |
| `src/hooks/useDailyPuzzle.ts` | Modify | Map new RPC columns into `Puzzle` |
| `src/hooks/useEndlessGame.ts` | Modify | Same mapper update |
| `src/components/ResultOverlay.tsx` | Modify | Add `imdbId` prop + IMDb link; dark variants |
| `src/components/ResultOverlay.test.tsx` | Modify | Tests for IMDb link |
| `src/pages/DailyPage.tsx` | Modify | Pass `imdbId`; year hint; auto-focus; dark variants |
| `src/pages/EndlessPage.tsx` | Modify | Pass `imdbId`; year hint; auto-focus; Enter-advances; dark variants |
| `src/components/GuessInput.tsx` | Modify | `autoFocus` prop; Escape-clears-value; dark variants |
| `src/components/GuessInput.test.tsx` | Modify | Tests for Escape-clears and autoFocus |
| `src/components/ClueDisplay.tsx` | Modify | Dark variants |
| `src/components/StatsModal.tsx` | Modify | Dark variants |
| `src/hooks/useDarkMode.ts` | Create | Hook: toggle, localStorage, html class |
| `src/hooks/useDarkMode.test.ts` | Create | Unit tests for the hook |
| `src/App.tsx` | Modify | Wire `useDarkMode`; moon/sun toggle button; dark variants |
| `tailwind.config.ts` | Modify | Add `darkMode: 'class'` |

---

## Task 1: Add `imdbId` and `releaseYear` to `Puzzle` type and hook mappers

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/hooks/useDailyPuzzle.ts`
- Modify: `src/hooks/useEndlessGame.ts`

- [ ] **Step 1: Update the `Puzzle` interface**

In `src/types/index.ts`, add two fields to the `Puzzle` interface after `posterUrl`:

```ts
export interface Puzzle {
  puzzleNumber: number;
  movieId: string;
  title: string;
  normalizedTitle: string;
  altTitles: string[];
  posterUrl: string | null;
  imdbId: string | null;
  releaseYear: number | null;
  clues: {
    hard: Clue;
    medium: Clue;
    easy: Clue;
  };
}
```

- [ ] **Step 2: Run TypeScript to see the expected errors**

```bash
npx tsc --noEmit
```

Expected: errors in `useDailyPuzzle.ts` and `useEndlessGame.ts` where `Puzzle` is constructed without the new fields.

- [ ] **Step 3: Update `useDailyPuzzle.ts` mapper**

In `src/hooks/useDailyPuzzle.ts`, inside `fetchDailyPuzzle`, update the `setPuzzle` call to include the new fields after `posterUrl`:

```ts
setPuzzle({
  puzzleNumber: row.puzzle_number,
  movieId: row.movie_id,
  title: row.title,
  normalizedTitle: row.normalized_title,
  altTitles: row.alt_titles ?? [],
  posterUrl: row.poster_url ?? null,
  imdbId: row.imdb_id ?? null,
  releaseYear: row.release_year ?? null,
  clues: {
    hard: { id: row.clue_hard_id, text: row.hard_clue, difficulty: 'hard' },
    medium: { id: row.clue_medium_id, text: row.medium_clue, difficulty: 'medium' },
    easy: { id: row.clue_easy_id, text: row.easy_clue, difficulty: 'easy' },
  },
});
```

- [ ] **Step 4: Update `useEndlessGame.ts` mapper**

In `src/hooks/useEndlessGame.ts`, inside `fetchNext`, update the `setPuzzle` call:

```ts
setPuzzle({
  puzzleNumber: 0,
  movieId: row.movie_id,
  title: row.title,
  normalizedTitle: row.normalized_title,
  altTitles: row.alt_titles ?? [],
  posterUrl: row.poster_url ?? null,
  imdbId: row.imdb_id ?? null,
  releaseYear: row.release_year ?? null,
  clues: {
    hard: { id: '', text: row.hard_clue, difficulty: 'hard' },
    medium: { id: '', text: row.medium_clue, difficulty: 'medium' },
    easy: { id: '', text: row.easy_clue, difficulty: 'easy' },
  },
});
```

- [ ] **Step 5: Run TypeScript and tests to verify no errors**

```bash
npx tsc --noEmit && npm test
```

Expected: 0 type errors, all existing tests pass.

- [ ] **Step 6: Verify Supabase RPCs return the new columns (manual)**

In the Supabase Dashboard → Database → Functions, open `get_daily_puzzle` and `get_random_movie`. Confirm they `SELECT imdb_id, release_year` from the `movies` table. If either column is missing from the SELECT, add it. (The columns already exist in the schema — this is a SELECT-only change.)

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/hooks/useDailyPuzzle.ts src/hooks/useEndlessGame.ts
git commit -m "feat: add imdbId and releaseYear to Puzzle type and hook mappers"
```

---

## Task 2: C1 — IMDb link on result card

**Files:**
- Modify: `src/components/ResultOverlay.tsx`
- Modify: `src/components/ResultOverlay.test.tsx`
- Modify: `src/pages/DailyPage.tsx`
- Modify: `src/pages/EndlessPage.tsx`

- [ ] **Step 1: Write failing tests**

Add to `src/components/ResultOverlay.test.tsx` (before the closing `}`):

```tsx
it('shows IMDb link when imdbId is provided', () => {
  render(
    <ResultOverlay
      result="correct"
      movieTitle="Inception"
      posterUrl={null}
      difficulty="hard"
      imdbId="tt1375666"
    />
  );
  const link = screen.getByRole('link', { name: /imdb/i });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', 'https://www.imdb.com/title/tt1375666');
  expect(link).toHaveAttribute('target', '_blank');
});

it('does not show IMDb link when imdbId is null', () => {
  render(
    <ResultOverlay
      result="correct"
      movieTitle="Inception"
      posterUrl={null}
      difficulty="hard"
      imdbId={null}
    />
  );
  expect(screen.queryByRole('link', { name: /imdb/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test ResultOverlay
```

Expected: 2 new tests FAIL — TypeScript error on unknown `imdbId` prop.

- [ ] **Step 3: Add `imdbId` prop and IMDb link to `ResultOverlay`**

In `src/components/ResultOverlay.tsx`:

Update the `Props` interface:

```ts
interface Props {
  result: GuessResult;
  movieTitle: string;
  posterUrl: string | null;
  difficulty: Difficulty;
  imdbId?: string | null;
  onNext?: () => void;
  onShowStats?: () => void;
  isEndless?: boolean;
}
```

Add the link after the poster `<img>` block (after the closing `}` of the `posterUrl &&` conditional):

```tsx
{posterUrl && (
  <img
    src={posterUrl}
    alt={movieTitle}
    className="mx-auto mt-3 h-72 w-auto rounded object-cover shadow"
  />
)}

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

- [ ] **Step 4: Pass `imdbId` from `DailyPage`**

In `src/pages/DailyPage.tsx`, update the `ResultOverlay` usage:

```tsx
<ResultOverlay
  result={state.result}
  movieTitle={puzzle.title}
  posterUrl={puzzle.posterUrl}
  imdbId={puzzle.imdbId}
  difficulty={state.revealedDifficulty}
  onShowStats={onShowStats}
/>
```

- [ ] **Step 5: Pass `imdbId` from `EndlessPage`**

In `src/pages/EndlessPage.tsx`, update the `ResultOverlay` usage:

```tsx
<ResultOverlay
  result={state.result}
  movieTitle={puzzle.title}
  posterUrl={puzzle.posterUrl}
  imdbId={puzzle.imdbId}
  difficulty={state.revealedDifficulty}
  onNext={handleNext}
  isEndless
/>
```

- [ ] **Step 6: Run tests**

```bash
npm test ResultOverlay
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/ResultOverlay.tsx src/components/ResultOverlay.test.tsx src/pages/DailyPage.tsx src/pages/EndlessPage.tsx
git commit -m "feat: add IMDb link to result card"
```

---

## Task 3: C2 — Year hint button

**Files:**
- Modify: `src/pages/DailyPage.tsx`
- Modify: `src/pages/EndlessPage.tsx`

- [ ] **Step 1: Add `showYear` state to `DailyPage`**

In `src/pages/DailyPage.tsx`, add the state declaration after the existing `useState` calls:

```tsx
const [showYear, setShowYear] = useState(false);
```

- [ ] **Step 2: Add year hint UI to `DailyPage`**

In `src/pages/DailyPage.tsx`, inside the `<div className="mt-4 space-y-2">` block, add the year hint between the `ClueDisplay` and the guess input — place it just before the `{!isDone && !alreadyPlayedToday && (` block:

```tsx
{state.revealedDifficulty === 'easy' && state.result === 'unanswered' && !alreadyPlayedToday && (
  <div className="mt-3 text-center">
    {showYear ? (
      <p className="text-sm text-slate-500">
        Released:{' '}
        <span className="font-semibold text-slate-700">{puzzle.releaseYear}</span>
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

- [ ] **Step 3: Add `showYear` state to `EndlessPage`**

In `src/pages/EndlessPage.tsx`, add the state declaration after the existing `useState` calls:

```tsx
const [showYear, setShowYear] = useState(false);
```

- [ ] **Step 4: Reset `showYear` in `handleNext`**

In `src/pages/EndlessPage.tsx`, update `handleNext`:

```tsx
function handleNext() {
  setInputValue('');
  setShowYear(false);
  fetchNext();
}
```

- [ ] **Step 5: Add year hint UI to `EndlessPage`**

In `src/pages/EndlessPage.tsx`, inside the `<div className="mt-4 space-y-2">` block, add the year hint just before the guess input block (`{!isDone && (`):

```tsx
{state.revealedDifficulty === 'easy' && state.result === 'unanswered' && (
  <div className="mt-3 text-center">
    {showYear ? (
      <p className="text-sm text-slate-500">
        Released:{' '}
        <span className="font-semibold text-slate-700">{puzzle.releaseYear}</span>
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

- [ ] **Step 6: Run tests and manual smoke-test**

```bash
npm test
```

Expected: all existing tests still pass (year hint has no unit test — verify manually in the app: guess incorrectly twice until the easy clue shows, confirm "Reveal year" button appears, click it, confirm the year renders).

- [ ] **Step 7: Commit**

```bash
git add src/pages/DailyPage.tsx src/pages/EndlessPage.tsx
git commit -m "feat: add year hint reveal button on final clue"
```

---

## Task 4: D2 — Keyboard shortcut polish

**Files:**
- Modify: `src/components/GuessInput.tsx`
- Modify: `src/components/GuessInput.test.tsx`
- Modify: `src/pages/EndlessPage.tsx`
- Modify: `src/pages/DailyPage.tsx`

- [ ] **Step 1: Write failing tests**

Add to `src/components/GuessInput.test.tsx` (before the closing `}`):

```tsx
it('Escape clears the input value when dropdown is already closed', () => {
  const onChange = vi.fn();
  renderInput({ value: 'Inception', onChange, suggestions: [] });
  const input = screen.getByRole('combobox');
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(onChange).toHaveBeenCalledWith('');
});

it('first Escape closes dropdown, second Escape clears value', () => {
  const onChange = vi.fn();
  renderInput({ value: 'da', onChange, suggestions: SUGGESTIONS });
  const input = screen.getByRole('combobox');
  // First Escape: close dropdown
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
  // Second Escape: clear value
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(onChange).toHaveBeenCalledWith('');
});

it('renders input with autoFocus when autoFocus prop is true', () => {
  renderInput({ autoFocus: true });
  expect(screen.getByRole('combobox')).toHaveFocus();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test GuessInput
```

Expected: 3 new tests FAIL.

- [ ] **Step 3: Add `autoFocus` prop and Escape-clears-value to `GuessInput`**

In `src/components/GuessInput.tsx`, update the `Props` interface:

```ts
interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (guess: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  suggestions?: string[];
  onSuggestionSelect?: (title: string) => void;
}
```

Update the function signature to destructure `autoFocus`:

```tsx
export function GuessInput({
  value,
  onChange,
  onSubmit,
  disabled,
  autoFocus,
  suggestions = [],
  onSuggestionSelect,
}: Props) {
```

Update `handleKeyDown` — replace the existing `Escape` branch:

```ts
} else if (e.key === 'Escape') {
  if (open) {
    setOpen(false);
  } else {
    onChange('');
  }
}
```

Add `autoFocus={autoFocus}` to the `<input>` element:

```tsx
<input
  id="guess-input"
  type="text"
  value={value}
  onChange={handleChange}
  onKeyDown={handleKeyDown}
  disabled={disabled}
  autoFocus={autoFocus}
  placeholder="Type the movie title…"
  className="flex-1 rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none transition-colors focus:border-slate-900 disabled:bg-slate-100"
  autoComplete="off"
  autoCapitalize="off"
  spellCheck={false}
  role="combobox"
  aria-expanded={showDropdown}
  aria-controls="suggestions-list"
  aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
/>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test GuessInput
```

Expected: all tests PASS.

- [ ] **Step 5: Pass `autoFocus` from `DailyPage`**

In `src/pages/DailyPage.tsx`, update the `GuessInput` usage:

```tsx
<GuessInput
  value={inputValue}
  onChange={setInputValue}
  onSubmit={handleGuess}
  autoFocus={true}
  suggestions={suggestions}
  onSuggestionSelect={handleSuggestionSelect}
/>
```

- [ ] **Step 6: Pass `autoFocus` and wire Enter-advances in `EndlessPage`**

In `src/pages/EndlessPage.tsx`, update the `GuessInput` usage:

```tsx
<GuessInput
  value={inputValue}
  onChange={setInputValue}
  onSubmit={handleGuess}
  autoFocus={true}
  suggestions={suggestions}
  onSuggestionSelect={setInputValue}
/>
```

Add a `useEffect` for Enter-advances (place after the existing `useEffect` calls):

```tsx
useEffect(() => {
  if (!isDone) return;
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleNext();
  }
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [isDone]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 7: Run tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/GuessInput.tsx src/components/GuessInput.test.tsx src/pages/DailyPage.tsx src/pages/EndlessPage.tsx
git commit -m "feat: keyboard polish — autoFocus input, Escape clears, Enter advances endless"
```

---

## Task 5: D1 — Dark mode toggle

### Task 5a: Tailwind config + `useDarkMode` hook + header button

**Files:**
- Modify: `tailwind.config.ts`
- Create: `src/hooks/useDarkMode.ts`
- Create: `src/hooks/useDarkMode.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Enable Tailwind class-based dark mode**

In `tailwind.config.ts`, add `darkMode: 'class'` to the config object:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: Write failing tests for `useDarkMode`**

Create `src/hooks/useDarkMode.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useDarkMode } from './useDarkMode';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('useDarkMode', () => {
  it('defaults to light mode when no stored preference', () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('toggles dark mode on and applies class to html element', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => result.current.toggleDarkMode());
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('dark-mode')).toBe('true');
  });

  it('toggles back to light mode', () => {
    const { result } = renderHook(() => useDarkMode());
    act(() => result.current.toggleDarkMode());
    act(() => result.current.toggleDarkMode());
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reads persisted dark preference on mount', () => {
    localStorage.setItem('dark-mode', 'true');
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test useDarkMode
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create `useDarkMode` hook**

Create `src/hooks/useDarkMode.ts`:

```ts
import { useEffect, useState } from 'react';

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

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test useDarkMode
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Wire `useDarkMode` into `AppShell` and add toggle button**

In `src/App.tsx`, import the hook:

```ts
import { useDarkMode } from './hooks/useDarkMode';
```

Add to `AppShell` (after the existing hook calls):

```tsx
const { isDark, toggleDarkMode } = useDarkMode();
```

Add the toggle button to the `<nav>` (after the stats `📊` button):

```tsx
<button
  aria-label="toggle dark mode"
  onClick={toggleDarkMode}
  className="ml-1 rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
>
  {isDark ? '☀️' : '🌙'}
</button>
```

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add tailwind.config.ts src/hooks/useDarkMode.ts src/hooks/useDarkMode.test.ts src/App.tsx
git commit -m "feat: add dark mode toggle with localStorage persistence"
```

---

### Task 5b: Dark variants on shared components

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ClueDisplay.tsx`
- Modify: `src/components/GuessInput.tsx`
- Modify: `src/components/ResultOverlay.tsx`
- Modify: `src/components/StatsModal.tsx`

> These are visual-only changes. Verify manually by toggling dark mode in the browser after each file.

- [ ] **Step 1: Dark variants on `App.tsx` layout**

In `src/App.tsx`, update the two elements in `AppShell`:

Page wrapper div — add `dark:bg-slate-900`:
```tsx
<div className="min-h-screen bg-slate-50 dark:bg-slate-900">
```

Header — add dark variants:
```tsx
<header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
```

Title text — add `dark:text-white`:
```tsx
<h1 className="font-display text-xl font-black tracking-tight text-slate-900 dark:text-white">
```

Nav active link — add dark variants to both `NavLink` className callbacks. Active state:
```
'rounded-md bg-slate-100 px-3 py-1.5 text-slate-900 dark:bg-slate-700 dark:text-white'
```
Inactive state:
```
'rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
```

Stats button — add dark variant:
```tsx
className="ml-1 rounded-md bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
```

- [ ] **Step 2: Dark variants on `ClueDisplay.tsx`**

In `src/components/ClueDisplay.tsx`:

Revealed clue card:
```tsx
`clue-entering rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${BORDER_CLASSES[diff]}`
```

Unrevealed clue card:
```tsx
'rounded-xl border border-dashed border-slate-200 border-l-4 border-l-slate-200 bg-slate-50 p-4 opacity-40 dark:border-slate-700 dark:border-l-slate-700 dark:bg-slate-900'
```

Clue text:
```tsx
<p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{clues[diff].text}</p>
```

Unrevealed placeholder text:
```tsx
<p className="text-sm italic text-slate-400 dark:text-slate-500">
```

- [ ] **Step 3: Dark variants on `GuessInput.tsx`**

In `src/components/GuessInput.tsx`:

Text input:
```tsx
className="flex-1 rounded-lg border-2 border-slate-200 px-4 py-2 text-sm outline-none transition-colors focus:border-slate-900 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 dark:focus:border-slate-300 dark:disabled:bg-slate-800"
```

Submit button:
```tsx
className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
```

Suggestions dropdown `<ul>`:
```tsx
className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden dark:border-slate-700 dark:bg-slate-800"
```

Active suggestion `<li>` (the ternary's active branch):
```
'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
```

Inactive suggestion:
```
'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
```

- [ ] **Step 4: Dark variants on `ResultOverlay.tsx`**

In `src/components/ResultOverlay.tsx`:

Card wrapper:
```tsx
className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800"
```

Movie title:
```tsx
<p className="text-xl font-semibold text-slate-900 dark:text-white">{movieTitle}</p>
```

IMDb link:
```tsx
className="mt-2 inline-block text-xs text-slate-400 hover:text-slate-600 underline dark:text-slate-500 dark:hover:text-slate-300"
```

Next Movie button:
```tsx
className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
```

Stats button:
```tsx
className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
```

- [ ] **Step 5: Dark variants on `StatsModal.tsx`**

In `src/components/StatsModal.tsx`:

Modal panel:
```tsx
className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
```

Close button:
```tsx
className="absolute right-4 top-4 text-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
```

Tab bar wrapper:
```tsx
className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-700"
```

Daily tab button:
```tsx
className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
  tab === 'daily'
    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
    : 'text-slate-500 dark:text-slate-400'
}`}
```

Endless tab button:
```tsx
className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
  tab === 'endless'
    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-600 dark:text-white'
    : 'text-slate-500 dark:text-slate-400'
}`}
```

Stat values (the `text-2xl` numbers):
```tsx
<div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
```

Stat labels:
```tsx
<div className="text-xs text-slate-400 dark:text-slate-500">{label}</div>
```

Distribution section label:
```tsx
<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
```

`DistributionBar` label span:
```tsx
<span className="w-16 text-xs text-slate-500 dark:text-slate-400">{label}</span>
```

Bar background track:
```tsx
<div className="relative h-5 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-700">
```

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: all tests PASS (dark variants don't affect test assertions).

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/ClueDisplay.tsx src/components/GuessInput.tsx src/components/ResultOverlay.tsx src/components/StatsModal.tsx
git commit -m "feat: add dark mode variants to shared components"
```

---

### Task 5c: Dark variants on page components

**Files:**
- Modify: `src/pages/DailyPage.tsx`
- Modify: `src/pages/EndlessPage.tsx`

- [ ] **Step 1: Dark variants on `DailyPage.tsx`**

Puzzle number label:
```tsx
<span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
```

Streak badge:
```tsx
className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300"
```

Wrong guess pill:
```tsx
className="flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900 dark:bg-slate-800 dark:text-red-400"
```

Year hint paragraph (released text):
```tsx
<p className="text-sm text-slate-500 dark:text-slate-400">
  Released:{' '}
  <span className="font-semibold text-slate-700 dark:text-slate-200">{puzzle.releaseYear}</span>
</p>
```

Year hint button:
```tsx
className="text-xs text-slate-400 underline hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
```

"Already played today" message:
```tsx
<p className="text-center text-sm text-slate-500 dark:text-slate-400">
```

Footer attribution:
```tsx
<footer className="mt-10 text-center text-xs text-slate-400 dark:text-slate-600">
```

- [ ] **Step 2: Dark variants on `EndlessPage.tsx`**

Header row (mode label and score):
```tsx
<span className="font-medium text-slate-700 dark:text-slate-300">Endless Mode</span>
```
```tsx
<span className="dark:text-slate-400">Score: {sessionScore}</span>
```

Wrong guess pill — same as `DailyPage`:
```tsx
className="flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900 dark:bg-slate-800 dark:text-red-400"
```

Year hint paragraph (released text):
```tsx
<p className="text-sm text-slate-500 dark:text-slate-400">
  Released:{' '}
  <span className="font-semibold text-slate-700 dark:text-slate-200">{puzzle.releaseYear}</span>
</p>
```

Year hint button:
```tsx
className="text-xs text-slate-400 underline hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 4: Manual smoke-test**

Start the dev server (`npm run dev`), open the app, click 🌙 to enter dark mode. Verify:
- Header, page background, clue cards, guess input, suggestions dropdown all show dark styling
- Toggle back to ☀️ — everything returns to light
- Refresh the page — preference persists

- [ ] **Step 5: Commit**

```bash
git add src/pages/DailyPage.tsx src/pages/EndlessPage.tsx
git commit -m "feat: add dark mode variants to page components"
```
