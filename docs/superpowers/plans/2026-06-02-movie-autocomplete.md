# Movie Title Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dropdown autocomplete to the movie guess input that filters from the game's own movie list, requires 2+ characters, fills the input on selection, and supports keyboard navigation.

**Architecture:** Preload all movie titles from Supabase once on game load via a new `get_movie_titles` RPC. A `useMovieSuggestions` hook filters them client-side. `GuessInput` becomes a controlled component that renders the dropdown; `DailyPage` lifts state and wires everything together.

**Tech Stack:** React 18, TypeScript, Vitest, @testing-library/react, Tailwind CSS, Supabase JS client

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/hooks/useMovieSuggestions.ts` | Pure filtering logic — titles in, suggestions out |
| Create | `src/hooks/useMovieSuggestions.test.ts` | Unit tests for filtering hook |
| Modify | `src/hooks/useDailyPuzzle.ts` | Fetch movie titles on load, expose `movieTitles` |
| Modify | `src/components/GuessInput.tsx` | Controlled input + dropdown + keyboard nav |
| Create | `src/components/GuessInput.test.tsx` | Component tests for autocomplete behaviour |
| Modify | `src/pages/DailyPage.tsx` | Lift input state, wire `useMovieSuggestions`, pass props |

---

## Task 1: `useMovieSuggestions` hook

**Files:**
- Create: `src/hooks/useMovieSuggestions.ts`
- Create: `src/hooks/useMovieSuggestions.test.ts`

- [ ] **Step 1.1 — Write failing tests**

Create `src/hooks/useMovieSuggestions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getMovieSuggestions } from './useMovieSuggestions';

const TITLES = [
  'The Dark Knight',
  'The Dark Knight Rises',
  'Batman Begins',
  'Inception',
  'Interstellar',
  'In the Mood for Love',
  'In Bruges',
];

describe('getMovieSuggestions', () => {
  it('returns empty array when query is fewer than 2 characters', () => {
    expect(getMovieSuggestions(TITLES, '')).toEqual([]);
    expect(getMovieSuggestions(TITLES, 'T')).toEqual([]);
  });

  it('returns empty array when titles list is empty', () => {
    expect(getMovieSuggestions([], 'dark')).toEqual([]);
  });

  it('matches by substring, case-insensitive', () => {
    expect(getMovieSuggestions(TITLES, 'dark')).toContain('The Dark Knight');
    expect(getMovieSuggestions(TITLES, 'DARK')).toContain('The Dark Knight');
  });

  it('returns at most 6 results', () => {
    const many = Array.from({ length: 20 }, (_, i) => `Movie ${i} inter`);
    expect(getMovieSuggestions(many, 'inter').length).toBeLessThanOrEqual(6);
  });

  it('matches substring anywhere in the title', () => {
    const results = getMovieSuggestions(TITLES, 'in');
    expect(results).toContain('Batman Begins');
    expect(results).toContain('Inception');
  });

  it('returns all matches when fewer than 6', () => {
    const results = getMovieSuggestions(TITLES, 'dark');
    expect(results).toHaveLength(2);
    expect(results).toContain('The Dark Knight');
    expect(results).toContain('The Dark Knight Rises');
  });
});
```

- [ ] **Step 1.2 — Run tests, confirm failure**

```
npx vitest run src/hooks/useMovieSuggestions.test.ts
```

Expected: FAIL — `getMovieSuggestions` is not defined.

- [ ] **Step 1.3 — Implement the hook**

Create `src/hooks/useMovieSuggestions.ts`:

```ts
export function getMovieSuggestions(titles: string[], query: string): string[] {
  if (query.length < 2) return [];
  const lower = query.toLowerCase();
  const results: string[] = [];
  for (const title of titles) {
    if (title.toLowerCase().includes(lower)) {
      results.push(title);
      if (results.length === 6) break;
    }
  }
  return results;
}
```

- [ ] **Step 1.4 — Run tests, confirm pass**

```
npx vitest run src/hooks/useMovieSuggestions.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 1.5 — Commit**

```bash
git add src/hooks/useMovieSuggestions.ts src/hooks/useMovieSuggestions.test.ts
git commit -m "feat: add useMovieSuggestions filtering hook"
```

---

## Task 2: Supabase RPC + extend `useDailyPuzzle`

**Files:**
- Modify: `src/hooks/useDailyPuzzle.ts`

- [ ] **Step 2.1 — Create Supabase RPC**

Open the Supabase dashboard → SQL Editor → run:

```sql
CREATE OR REPLACE FUNCTION get_movie_titles()
RETURNS TABLE(title text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT title FROM movies ORDER BY title;
$$;
```

> If `movies` is not the table name, adjust to whatever table `get_daily_puzzle` reads from. The function only needs to return `title text`.

- [ ] **Step 2.2 — Add `movieTitles` state and fetch to `useDailyPuzzle`**

Open `src/hooks/useDailyPuzzle.ts`. Make these changes:

Add `movieTitles` state after the existing `error` state (line 25):

```ts
const [movieTitles, setMovieTitles] = useState<string[]>([]);
```

Replace `fetchDailyPuzzle` (lines 61–90) with this version that fetches both in parallel:

```ts
async function fetchDailyPuzzle() {
  setLoading(true);
  setError(null);

  const [titlesResult, puzzleResult] = await Promise.all([
    supabase.rpc('get_movie_titles'),
    supabase.rpc('get_daily_puzzle', { p_date: todayStr() }),
  ]);

  if (titlesResult.data) {
    setMovieTitles(
      (titlesResult.data as { title: string }[]).map((r) => r.title)
    );
  }

  const { data, error: err } = puzzleResult;

  if (err || !data?.length) {
    setError('No puzzle available for today. Check back tomorrow!');
    setLoading(false);
    return;
  }

  const row = data[0];
  setPuzzle({
    puzzleNumber: row.puzzle_number,
    movieId: row.movie_id,
    title: row.title,
    normalizedTitle: row.normalized_title,
    altTitles: row.alt_titles ?? [],
    posterUrl: row.poster_url ?? null,
    clues: {
      hard: { id: row.clue_hard_id, text: row.hard_clue, difficulty: 'hard' },
      medium: { id: row.clue_medium_id, text: row.medium_clue, difficulty: 'medium' },
      easy: { id: row.clue_easy_id, text: row.easy_clue, difficulty: 'easy' },
    },
  });

  setLoading(false);
}
```

Add `movieTitles` to the return value at the bottom of the hook (line 166):

```ts
return { puzzle, loading, error, state, savedResult, streak, submitGuess, refetch: fetchDailyPuzzle, movieTitles };
```

- [ ] **Step 2.3 — Confirm TypeScript compiles**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2.4 — Commit**

```bash
git add src/hooks/useDailyPuzzle.ts
git commit -m "feat: preload movie titles from Supabase on game start"
```

---

## Task 3: Update `GuessInput` — controlled input + autocomplete dropdown

**Files:**
- Modify: `src/components/GuessInput.tsx`
- Create: `src/components/GuessInput.test.tsx`

- [ ] **Step 3.1 — Write failing tests**

Create `src/components/GuessInput.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GuessInput } from './GuessInput';

const SUGGESTIONS = ['The Dark Knight', 'The Dark Knight Rises', 'Batman Begins'];

function renderInput(overrides = {}) {
  const props = {
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    suggestions: [],
    onSuggestionSelect: vi.fn(),
    ...overrides,
  };
  render(<GuessInput {...props} />);
  return props;
}

describe('GuessInput', () => {
  it('renders the text input and Guess button', () => {
    renderInput();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guess/i })).toBeInTheDocument();
  });

  it('shows no dropdown when suggestions is empty', () => {
    renderInput({ suggestions: [] });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows dropdown with suggestions when provided', () => {
    renderInput({ value: 'da', suggestions: SUGGESTIONS });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('The Dark Knight')).toBeInTheDocument();
  });

  it('calls onSuggestionSelect when a suggestion is clicked', () => {
    const onSuggestionSelect = vi.fn();
    renderInput({ value: 'da', suggestions: SUGGESTIONS, onSuggestionSelect });
    fireEvent.click(screen.getByText('The Dark Knight'));
    expect(onSuggestionSelect).toHaveBeenCalledWith('The Dark Knight');
  });

  it('calls onChange when user types', () => {
    const onChange = vi.fn();
    renderInput({ onChange });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'da' } });
    expect(onChange).toHaveBeenCalledWith('da');
  });

  it('ArrowDown moves active index down, Enter selects focused suggestion', () => {
    const onSuggestionSelect = vi.fn();
    renderInput({ value: 'da', suggestions: SUGGESTIONS, onSuggestionSelect });
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSuggestionSelect).toHaveBeenCalledWith('The Dark Knight');
  });

  it('Escape closes the dropdown', () => {
    renderInput({ value: 'da', suggestions: SUGGESTIONS });
    const input = screen.getByRole('textbox');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('calls onSubmit with current value on form submit', () => {
    const onSubmit = vi.fn();
    renderInput({ value: 'Inception', onSubmit });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith('Inception');
  });

  it('Guess button is disabled when value is empty', () => {
    renderInput({ value: '' });
    expect(screen.getByRole('button', { name: /guess/i })).toBeDisabled();
  });
});
```

- [ ] **Step 3.2 — Run tests, confirm failure**

```
npx vitest run src/components/GuessInput.test.tsx
```

Expected: FAIL — tests reference props that don't exist yet.

- [ ] **Step 3.3 — Rewrite `GuessInput.tsx`**

Replace the entire contents of `src/components/GuessInput.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (guess: string) => void;
  disabled?: boolean;
  suggestions?: string[];
  onSuggestionSelect?: (title: string) => void;
}

function highlightMatch(title: string, query: string) {
  const idx = title.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1 || query.length < 2) return title;
  return (
    <>
      {title.slice(0, idx)}
      <span className="bg-indigo-100 text-indigo-700 font-semibold rounded px-0.5">
        {title.slice(idx, idx + query.length)}
      </span>
      {title.slice(idx + query.length)}
    </>
  );
}

export function GuessInput({
  value,
  onChange,
  onSubmit,
  disabled,
  suggestions = [],
  onSuggestionSelect,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
    setOpen(suggestions.length > 0);
  }, [suggestions]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      onSuggestionSelect?.(suggestions[activeIndex]);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setOpen(false);
  }

  const showDropdown = open && suggestions.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="guess-input" className="sr-only">
          Movie title
        </label>
        <input
          id="guess-input"
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type the movie title…"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="suggestions-list"
          aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Guess
        </button>
      </form>

      {showDropdown && (
        <ul
          id="suggestions-list"
          role="listbox"
          className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
        >
          {suggestions.map((title, i) => (
            <li
              key={title}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                onSuggestionSelect?.(title);
                setOpen(false);
              }}
              className={`px-4 py-2 text-sm cursor-pointer ${
                i === activeIndex
                  ? 'bg-indigo-50 text-indigo-900'
                  : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              {highlightMatch(title, value)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3.4 — Run tests, confirm pass**

```
npx vitest run src/components/GuessInput.test.tsx
```

Expected: all 8 tests PASS.

- [ ] **Step 3.5 — Run full test suite**

```
npx vitest run
```

Expected: all existing tests still PASS.

- [ ] **Step 3.6 — Commit**

```bash
git add src/components/GuessInput.tsx src/components/GuessInput.test.tsx
git commit -m "feat: add autocomplete dropdown to GuessInput"
```

---

## Task 4: Wire `DailyPage` — lift state and connect autocomplete

**Files:**
- Modify: `src/pages/DailyPage.tsx`

- [ ] **Step 4.1 — Update `DailyPage`**

Replace the entire contents of `src/pages/DailyPage.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { useDailyPuzzle } from '../hooks/useDailyPuzzle';
import { getMovieSuggestions } from '../hooks/useMovieSuggestions';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';
import { ShareButton } from '../components/ShareButton';

interface Props {
  onShowStats: () => void;
}

export function DailyPage({ onShowStats }: Props) {
  const { puzzle, loading, error, state, savedResult, streak, submitGuess, movieTitles } =
    useDailyPuzzle();

  const [inputValue, setInputValue] = useState('');
  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = getMovieSuggestions(movieTitles, inputValue);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, []);

  function handleGuess(guess: string) {
    const correct = submitGuess(guess);
    setInputValue('');
    if (!correct) {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      setShaking(true);
      shakeTimer.current = setTimeout(() => setShaking(false), 300);
    }
  }

  function handleSuggestionSelect(title: string) {
    setInputValue(title);
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading today's puzzle…
      </div>
    );
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }
  if (!puzzle) return null;

  const isDone = state.result !== 'unanswered';
  const alreadyPlayedToday = savedResult !== null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span className="font-medium text-gray-700">
          Puzzle #{puzzle.puzzleNumber}
        </span>
        <span>🔥 Streak: {streak.current}</span>
      </div>

      <ClueDisplay
        clues={puzzle.clues}
        revealedDifficulty={state.revealedDifficulty}
      />

      <div className="mt-4 space-y-2">
        {!isDone && !alreadyPlayedToday && (
          <div className={shaking ? 'shake' : ''}>
            <GuessInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleGuess}
              suggestions={suggestions}
              onSuggestionSelect={handleSuggestionSelect}
            />
          </div>
        )}

        {state.guesses.map((g, i) => (
          <div
            key={`${i}-${g}`}
            className="rounded bg-red-50 px-3 py-1 text-sm text-red-600"
          >
            ✗ {g}
          </div>
        ))}

        {isDone && (
          <>
            <ResultOverlay
              result={state.result}
              movieTitle={puzzle.title}
              posterUrl={puzzle.posterUrl}
              difficulty={state.revealedDifficulty}
              onShowStats={onShowStats}
            />
            <ShareButton
              puzzleNumber={puzzle.puzzleNumber}
              result={state.result}
              revealedDifficulty={state.revealedDifficulty}
            />
          </>
        )}

        {alreadyPlayedToday && !isDone && (
          <p className="text-center text-sm text-gray-500">
            You've already played today. Come back tomorrow!
          </p>
        )}
      </div>

      <footer className="mt-10 text-center text-xs text-gray-400">
        This product uses the TMDb API but is not endorsed or certified by TMDb.
      </footer>
    </div>
  );
}
```

- [ ] **Step 4.2 — Confirm TypeScript compiles**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4.3 — Run full test suite**

```
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4.4 — Commit**

```bash
git add src/pages/DailyPage.tsx
git commit -m "feat: wire movie autocomplete into DailyPage"
```

---

## Task 5: Manual smoke test

- [ ] **Step 5.1 — Start dev server**

```
npm run dev
```

- [ ] **Step 5.2 — Verify autocomplete behaviour**

1. Open the game in the browser
2. Type one character — confirm no dropdown appears
3. Type a second character — confirm dropdown appears with matching titles highlighted
4. Use arrow keys to navigate — confirm focused item highlights
5. Press Enter on a suggestion — confirm input fills, dropdown closes, Guess button enables
6. Click Guess — confirm normal guess flow works
7. Click a suggestion with the mouse — confirm input fills
8. Press Escape — confirm dropdown closes

- [ ] **Step 5.3 — Add `.superpowers/` to `.gitignore` if not already present**

Check `.gitignore`. If `.superpowers/` is missing, add it:

```
.superpowers/
```

```bash
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm directory"
```
