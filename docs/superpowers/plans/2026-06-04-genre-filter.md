# Genre & Decade Filters + Seasonal Packs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add genre/decade filter chips to Endless mode and a zero-DB seasonal pack system driven by a frontend config file.

**Architecture:** Extend the `get_random_movie` Supabase RPC with optional `p_genre`, `p_decade`, and `p_included_ids` params. A new `GenreFilter` chip-row component in `EndlessPage` drives an `activeFilter` state that is passed into `useEndlessGame`, which forwards the appropriate param on every `fetchNext` call.

**Tech Stack:** React + TypeScript, Vitest + @testing-library/react, Supabase (PostgreSQL RPC), Tailwind CSS

---

## File Map

| Status | Path | Role |
|---|---|---|
| Create | `supabase/migrations/004_genre_decade_filter_rpc.sql` | Extends `get_random_movie` RPC |
| Create | `src/config/genres.ts` | Curated filter options (genre + decade) |
| Create | `src/config/packs.ts` | Seasonal pack config + `getActivePack()` |
| Create | `src/config/packs.test.ts` | Tests for `getActivePack()` |
| Create | `src/components/GenreFilter.tsx` | Chip row component |
| Create | `src/components/GenreFilter.test.tsx` | Component tests |
| Modify | `src/types/index.ts` | Add `ActiveFilter` union type |
| Modify | `src/hooks/useEndlessGame.ts` | Accept + apply `activeFilter` param |
| Modify | `src/pages/EndlessPage.tsx` | Add filter state, render `<GenreFilter>` |

---

## Task 1: DB Migration — Extend `get_random_movie` RPC

**Files:**
- Create: `supabase/migrations/004_genre_decade_filter_rpc.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/004_genre_decade_filter_rpc.sql
-- Add genre, decade, and pack (included_ids) filtering to get_random_movie
DROP FUNCTION IF EXISTS get_random_movie(uuid[]);

CREATE OR REPLACE FUNCTION get_random_movie(
  excluded_ids   uuid[],
  p_genre        text    DEFAULT NULL,
  p_decade       int     DEFAULT NULL,
  p_included_ids uuid[]  DEFAULT NULL
)
RETURNS TABLE (
  movie_id         uuid,
  title            text,
  normalized_title text,
  alt_titles       text[],
  poster_url       text,
  imdb_id          text,
  release_year     int,
  hard_clue        text,
  medium_clue      text,
  easy_clue        text
) AS $$
  SELECT
    m.id,
    m.title,
    m.normalized_title,
    m.alt_titles,
    m.poster_url,
    m.imdb_id,
    m.release_year,
    c_h.clue_text,
    c_m.clue_text,
    c_e.clue_text
  FROM movies m
  JOIN LATERAL (
    SELECT clue_text FROM clues
    WHERE movie_id = m.id AND difficulty = 'hard' AND is_active = true
    ORDER BY quality_score DESC LIMIT 1
  ) c_h ON true
  JOIN LATERAL (
    SELECT clue_text FROM clues
    WHERE movie_id = m.id AND difficulty = 'medium' AND is_active = true
    ORDER BY quality_score DESC LIMIT 1
  ) c_m ON true
  JOIN LATERAL (
    SELECT clue_text FROM clues
    WHERE movie_id = m.id AND difficulty = 'easy' AND is_active = true
    ORDER BY quality_score DESC LIMIT 1
  ) c_e ON true
  WHERE m.is_active = true
    AND NOT (m.id = ANY(excluded_ids))
    AND NOT EXISTS (
      SELECT 1 FROM daily_puzzles dp
      WHERE dp.movie_id = m.id AND dp.puzzle_date = CURRENT_DATE
    )
    AND (p_genre        IS NULL OR p_genre        = ANY(m.genres))
    AND (p_decade       IS NULL OR (m.release_year >= p_decade AND m.release_year < p_decade + 10))
    AND (p_included_ids IS NULL OR m.id = ANY(p_included_ids))
  ORDER BY RANDOM()
  LIMIT 1;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER;
```

- [ ] **Step 2: Run the migration in Supabase**

Open the Supabase dashboard → SQL Editor → paste the file contents → Run.

Verify: in the SQL Editor run:
```sql
SELECT * FROM get_random_movie(
  ARRAY[]::uuid[],
  'Horror',
  NULL,
  NULL
);
```
Expected: one row returned with a horror movie (or empty if none in pool — both are valid; no error is the key check).

- [ ] **Step 3: Verify existing Endless mode still works**

Run `npm run dev`, navigate to `/play`, confirm movies load as before (no RPC signature errors in browser console).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_genre_decade_filter_rpc.sql
git commit -m "feat: extend get_random_movie RPC with genre/decade/pack filters"
```

---

## Task 2: Config Files — genres.ts and packs.ts

**Files:**
- Create: `src/config/genres.ts`
- Create: `src/config/packs.ts`
- Create: `src/config/packs.test.ts`

- [ ] **Step 1: Write the failing tests for `getActivePack`**

```ts
// src/config/packs.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getActivePack } from './packs';

// Patch SEASONAL_PACKS via module mock so tests don't depend on the real array
vi.mock('./packs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./packs')>();
  return {
    ...actual,
    SEASONAL_PACKS: [
      {
        id: 'horror-2026',
        name: 'Horror Week',
        emoji: '🎃',
        movieIds: ['id-1', 'id-2'],
        startDate: '2026-10-25',
        endDate:   '2026-11-01',
      },
    ],
    getActivePack: actual.getActivePack,
  };
});

describe('getActivePack', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns the pack when today is within its range', () => {
    vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    // re-import to pick up faked date
    const { getActivePack: fn } = require('./packs');
    expect(fn()).not.toBeNull();
    expect(fn()!.id).toBe('horror-2026');
  });

  it('returns the pack on the start date', () => {
    vi.setSystemTime(new Date('2026-10-25T00:00:00Z'));
    const { getActivePack: fn } = require('./packs');
    expect(fn()).not.toBeNull();
  });

  it('returns the pack on the end date', () => {
    vi.setSystemTime(new Date('2026-11-01T23:59:59Z'));
    const { getActivePack: fn } = require('./packs');
    expect(fn()).not.toBeNull();
  });

  it('returns null before the start date', () => {
    vi.setSystemTime(new Date('2026-10-24T23:59:59Z'));
    const { getActivePack: fn } = require('./packs');
    expect(fn()).toBeNull();
  });

  it('returns null after the end date', () => {
    vi.setSystemTime(new Date('2026-11-02T00:00:00Z'));
    const { getActivePack: fn } = require('./packs');
    expect(fn()).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- --reporter=verbose src/config/packs.test.ts
```
Expected: FAIL — `getActivePack` not found.

- [ ] **Step 3: Create `src/config/packs.ts`**

```ts
// src/config/packs.ts
export interface SeasonalPack {
  id: string;
  name: string;
  emoji: string;
  movieIds: string[];
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
}

export const SEASONAL_PACKS: SeasonalPack[] = [
  // Example (uncomment and fill in movieIds to activate):
  // {
  //   id: 'horror-week-2026',
  //   name: 'Horror Week',
  //   emoji: '🎃',
  //   movieIds: [],
  //   startDate: '2026-10-25',
  //   endDate:   '2026-11-01',
  // },
];

export function getActivePack(): SeasonalPack | null {
  const today = new Date().toISOString().slice(0, 10);
  return SEASONAL_PACKS.find(p => p.startDate <= today && today <= p.endDate) ?? null;
}
```

- [ ] **Step 4: Create `src/config/genres.ts`**

```ts
// src/config/genres.ts
export type FilterKind = 'genre' | 'decade';

export interface FilterOption {
  id: string;
  label: string;
  emoji: string;
  kind: FilterKind;
  genreValue?: string;   // TMDb genre string — present when kind === 'genre'
  decadeValue?: number;  // e.g. 1990 — present when kind === 'decade'
}

export const GENRE_FILTERS: FilterOption[] = [
  { id: 'action',    label: 'Action',    emoji: '💥', kind: 'genre',  genreValue: 'Action' },
  { id: 'animation', label: 'Animation', emoji: '🎨', kind: 'genre',  genreValue: 'Animation' },
  { id: 'comedy',    label: 'Comedy',    emoji: '😂', kind: 'genre',  genreValue: 'Comedy' },
  { id: 'crime',     label: 'Crime',     emoji: '🔫', kind: 'genre',  genreValue: 'Crime' },
  { id: 'drama',     label: 'Drama',     emoji: '🎭', kind: 'genre',  genreValue: 'Drama' },
  { id: 'fantasy',   label: 'Fantasy',   emoji: '✨', kind: 'genre',  genreValue: 'Fantasy' },
  { id: 'horror',    label: 'Horror',    emoji: '👻', kind: 'genre',  genreValue: 'Horror' },
  { id: 'romance',   label: 'Romance',   emoji: '💕', kind: 'genre',  genreValue: 'Romance' },
  { id: 'scifi',     label: 'Sci-Fi',    emoji: '🚀', kind: 'genre',  genreValue: 'Science Fiction' },
  { id: 'thriller',  label: 'Thriller',  emoji: '🔪', kind: 'genre',  genreValue: 'Thriller' },
  { id: '80s',       label: '80s',       emoji: '📼', kind: 'decade', decadeValue: 1980 },
  { id: '90s',       label: '90s',       emoji: '💾', kind: 'decade', decadeValue: 1990 },
  { id: '2000s',     label: '2000s',     emoji: '💿', kind: 'decade', decadeValue: 2000 },
];
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose src/config/packs.test.ts
```
Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config/genres.ts src/config/packs.ts src/config/packs.test.ts
git commit -m "feat: add genre/decade filter config and seasonal pack config"
```

---

## Task 3: Add `ActiveFilter` Type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append `ActiveFilter` to `src/types/index.ts`**

Add at the end of the file:

```ts
export type ActiveFilter =
  | { kind: 'genre';  genreValue: string }
  | { kind: 'decade'; decadeValue: number }
  | { kind: 'pack';   movieIds: string[] };
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add ActiveFilter union type"
```

---

## Task 4: `GenreFilter` Component

**Files:**
- Create: `src/components/GenreFilter.tsx`
- Create: `src/components/GenreFilter.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/GenreFilter.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenreFilter } from './GenreFilter';
import type { SeasonalPack } from '../config/packs';

const noop = vi.fn();

describe('GenreFilter', () => {
  it('renders All chip and all genre/decade chips', () => {
    render(<GenreFilter activeId={null} onSelect={noop} activePack={null} />);
    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /horror/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sci-fi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /90s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2000s/i })).toBeInTheDocument();
  });

  it('does not render a pack chip when activePack is null', () => {
    render(<GenreFilter activeId={null} onSelect={noop} activePack={null} />);
    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
  });

  it('renders the pack chip with LIVE badge when activePack is provided', () => {
    const pack: SeasonalPack = {
      id: 'horror-2026', name: 'Horror Week', emoji: '🎃',
      movieIds: ['id-1'], startDate: '2026-10-25', endDate: '2026-11-01',
    };
    render(<GenreFilter activeId={null} onSelect={noop} activePack={pack} />);
    expect(screen.getByRole('button', { name: /horror week/i })).toBeInTheDocument();
    expect(screen.getByText(/live/i)).toBeInTheDocument();
  });

  it('calls onSelect with the chip id when a genre chip is clicked', () => {
    const onSelect = vi.fn();
    render(<GenreFilter activeId={null} onSelect={onSelect} activePack={null} />);
    fireEvent.click(screen.getByRole('button', { name: /horror/i }));
    expect(onSelect).toHaveBeenCalledWith('horror');
  });

  it('calls onSelect(null) when the active chip is clicked again', () => {
    const onSelect = vi.fn();
    render(<GenreFilter activeId="horror" onSelect={onSelect} activePack={null} />);
    fireEvent.click(screen.getByRole('button', { name: /horror/i }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('calls onSelect(null) when the All chip is clicked', () => {
    const onSelect = vi.fn();
    render(<GenreFilter activeId="horror" onSelect={onSelect} activePack={null} />);
    fireEvent.click(screen.getByRole('button', { name: /all/i }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('marks the All chip as active when activeId is null', () => {
    render(<GenreFilter activeId={null} onSelect={noop} activePack={null} />);
    const allBtn = screen.getByRole('button', { name: /all/i });
    expect(allBtn).toHaveClass('bg-slate-800');
  });

  it('marks the matching chip as active when activeId is set', () => {
    render(<GenreFilter activeId="horror" onSelect={noop} activePack={null} />);
    const horrorBtn = screen.getByRole('button', { name: /horror/i });
    expect(horrorBtn).toHaveClass('bg-slate-800');
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- --reporter=verbose src/components/GenreFilter.test.tsx
```
Expected: FAIL — `GenreFilter` not found.

- [ ] **Step 3: Create `src/components/GenreFilter.tsx`**

```tsx
// src/components/GenreFilter.tsx
import { GENRE_FILTERS } from '../config/genres';
import type { SeasonalPack } from '../config/packs';

interface Props {
  activeId: string | null;
  onSelect: (id: string | null) => void;
  activePack: SeasonalPack | null;
}

export function GenreFilter({ activeId, onSelect, activePack }: Props) {
  function handleClick(id: string | null) {
    onSelect(id === activeId ? null : id);
  }

  const activeBase = 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900';
  const inactiveBase =
    'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600';

  return (
    <div className="flex flex-wrap gap-2 pb-1">
      {activePack && (
        <button
          type="button"
          onClick={() => handleClick(activePack.id)}
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            activeId === activePack.id
              ? 'bg-orange-500 text-white'
              : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300'
          }`}
        >
          {activePack.emoji} {activePack.name}
          <span className="ml-1 rounded bg-white/30 px-1 text-[9px] font-bold uppercase tracking-wide">
            LIVE
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          activeId === null ? activeBase : inactiveBase
        }`}
      >
        All
      </button>

      {GENRE_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => handleClick(f.id)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            activeId === f.id ? activeBase : inactiveBase
          }`}
        >
          {f.label} {f.emoji}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose src/components/GenreFilter.test.tsx
```
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/GenreFilter.tsx src/components/GenreFilter.test.tsx
git commit -m "feat: add GenreFilter chip-row component"
```

---

## Task 5: Modify `useEndlessGame` — Apply Active Filter

**Files:**
- Modify: `src/hooks/useEndlessGame.ts`

- [ ] **Step 1: Update the hook signature and `fetchNext` to use `activeFilter`**

Replace the entire file content:

```ts
// src/hooks/useEndlessGame.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isCorrectGuess } from '../lib/guessMatch';
import type { Puzzle, RoundState, Difficulty, GameResultType, ActiveFilter } from '../types';

const DIFFICULTY_ORDER: Difficulty[] = ['hard', 'medium', 'easy'];
const POINTS_MAP: Record<Difficulty, number> = { hard: 3, medium: 2, easy: 1 };

export function useEndlessGame(
  saveEndlessResult: (result: GameResultType) => void,
  activeFilter: ActiveFilter | null
) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [playedIds, setPlayedIds] = useState<string[]>([]);
  const [state, setState] = useState<RoundState>({
    revealedDifficulty: 'hard',
    guesses: [],
    result: 'unanswered',
    showAllClues: false,
  });
  const [movieTitles, setMovieTitles] = useState<string[]>([]);

  useEffect(() => {
    supabase.rpc('get_movie_titles').then(({ data }) => {
      if (data) setMovieTitles((data as { title: string }[]).map((r) => r.title));
    });
  }, []);

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setPuzzle(null);
    setState({ revealedDifficulty: 'hard', guesses: [], result: 'unanswered', showAllClues: false });

    const params: {
      excluded_ids: string[];
      p_genre?: string;
      p_decade?: number;
      p_included_ids?: string[];
    } = { excluded_ids: playedIds };

    if (activeFilter?.kind === 'genre')  params.p_genre        = activeFilter.genreValue;
    if (activeFilter?.kind === 'decade') params.p_decade       = activeFilter.decadeValue;
    if (activeFilter?.kind === 'pack')   params.p_included_ids = activeFilter.movieIds;

    const { data, error } = await supabase.rpc('get_random_movie', params);

    try {
      if (error || !data?.length) {
        return;
      }

      const row = data[0];
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
          hard:   { id: '', text: row.hard_clue,   difficulty: 'hard' },
          medium: { id: '', text: row.medium_clue, difficulty: 'medium' },
          easy:   { id: '', text: row.easy_clue,   difficulty: 'easy' },
        },
      });
      setPlayedIds((prev) => [...prev, row.movie_id]);
    } finally {
      setLoading(false);
    }
  }, [playedIds, activeFilter]);

  function submitGuess(guess: string): boolean {
    if (!puzzle || state.result !== 'unanswered') return false;

    const correct = isCorrectGuess(guess, puzzle.normalizedTitle, puzzle.altTitles);
    const newGuesses = [...state.guesses, guess];
    const currentIndex = DIFFICULTY_ORDER.indexOf(state.revealedDifficulty);

    if (correct) {
      saveEndlessResult(state.revealedDifficulty);
      setSessionScore((s) => s + POINTS_MAP[state.revealedDifficulty]);
      setState({ ...state, guesses: newGuesses, result: 'correct', showAllClues: true });
      return true;
    } else if (currentIndex < DIFFICULTY_ORDER.length - 1) {
      setState({
        guesses: newGuesses,
        revealedDifficulty: DIFFICULTY_ORDER[currentIndex + 1],
        result: 'unanswered',
        showAllClues: false,
      });
      return false;
    } else {
      saveEndlessResult('miss');
      setState({ ...state, guesses: newGuesses, result: 'wrong', showAllClues: false });
      return false;
    }
  }

  return { puzzle, loading, sessionScore, state, fetchNext, submitGuess, movieTitles };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: one type error in `EndlessPage.tsx` — it now passes `useEndlessGame` one argument, but two are expected. That's expected; we fix it in the next task.

- [ ] **Step 3: Run full test suite to verify nothing broke**

```bash
npm test
```
Expected: all existing tests PASS (the hook itself has no unit tests; the type error is a compile error, not a test failure).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useEndlessGame.ts
git commit -m "feat: pass activeFilter to get_random_movie RPC in useEndlessGame"
```

---

## Task 6: Update `EndlessPage` — Wire Up Filter

**Files:**
- Modify: `src/pages/EndlessPage.tsx`

- [ ] **Step 1: Replace `EndlessPage.tsx` with the updated version**

```tsx
// src/pages/EndlessPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEndlessGame } from '../hooks/useEndlessGame';
import { getMovieSuggestions } from '../hooks/useMovieSuggestions';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';
import { GenreFilter } from '../components/GenreFilter';
import { GENRE_FILTERS } from '../config/genres';
import { getActivePack } from '../config/packs';
import type { GameResultType, ActiveFilter } from '../types';

interface Props {
  saveEndlessResult: (result: GameResultType) => void;
}

export function EndlessPage({ saveEndlessResult }: Props) {
  const activePack = useMemo(() => getActivePack(), []);

  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  const activeFilter = useMemo((): ActiveFilter | null => {
    if (!activeFilterId) return null;
    if (activePack && activeFilterId === activePack.id) {
      return { kind: 'pack', movieIds: activePack.movieIds };
    }
    const opt = GENRE_FILTERS.find((f) => f.id === activeFilterId);
    if (!opt) return null;
    if (opt.kind === 'genre')  return { kind: 'genre',  genreValue:  opt.genreValue! };
    if (opt.kind === 'decade') return { kind: 'decade', decadeValue: opt.decadeValue! };
    return null;
  }, [activeFilterId, activePack]);

  const { puzzle, loading, sessionScore, state, fetchNext, submitGuess, movieTitles } =
    useEndlessGame(saveEndlessResult, activeFilter);

  const [inputValue, setInputValue] = useState('');
  const [shaking, setShaking] = useState(false);
  const [showYear, setShowYear] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(
    () => getMovieSuggestions(movieTitles, inputValue),
    [movieTitles, inputValue]
  );

  const isDone = state.result !== 'unanswered';

  useEffect(() => {
    fetchNext();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isDone) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDone]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGuess(guess: string) {
    const correct = submitGuess(guess);
    setInputValue('');
    if (!correct) {
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      setShaking(true);
      shakeTimer.current = setTimeout(() => setShaking(false), 300);
    }
  }

  function handleNext() {
    setInputValue('');
    setShowYear(false);
    fetchNext();
  }

  function handleFilterSelect(id: string | null) {
    setActiveFilterId(id);
    setInputValue('');
    setShowYear(false);
    fetchNext();
  }

  const activeFilterLabel = useMemo(() => {
    if (!activeFilterId) return null;
    if (activePack && activeFilterId === activePack.id) return activePack.name;
    return GENRE_FILTERS.find((f) => f.id === activeFilterId)?.label ?? null;
  }, [activeFilterId, activePack]);

  if (loading && !puzzle) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>;
  }

  if (!loading && !puzzle) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">
          {activeFilterLabel
            ? `No more ${activeFilterLabel} movies available — try a different filter or switch to All.`
            : 'No more movies available — impressive!'}
        </p>
      </div>
    );
  }

  if (!puzzle) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span className="font-medium text-slate-700 dark:text-slate-300">Endless Mode</span>
        <span className="dark:text-slate-400">Score: {sessionScore}</span>
      </div>

      <div className="mb-4">
        <GenreFilter
          activeId={activeFilterId}
          onSelect={handleFilterSelect}
          activePack={activePack}
        />
      </div>

      <ClueDisplay
        clues={puzzle.clues}
        revealedDifficulty={state.revealedDifficulty}
        showAll={state.showAllClues}
      />

      <div className="mt-4 space-y-2">
        {state.revealedDifficulty === 'easy' && state.result === 'unanswered' && puzzle.releaseYear !== null && (
          <div className="mt-3 text-center">
            {showYear ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Released:{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{puzzle.releaseYear}</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setShowYear(true)}
                className="text-xs text-slate-400 underline hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                Reveal year
              </button>
            )}
          </div>
        )}

        {!isDone && (
          <div className={shaking ? 'shake' : ''}>
            <GuessInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleGuess}
              autoFocus={true}
              suggestions={suggestions}
              onSuggestionSelect={setInputValue}
            />
          </div>
        )}

        {!isDone &&
          state.guesses.map((g, i) => (
            <div
              key={`${i}-${g}`}
              className="flex items-center gap-2 rounded-lg border border-red-100 bg-white px-3 py-2 text-sm font-medium text-red-600 dark:border-red-900 dark:bg-slate-800 dark:text-red-400"
            >
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-[10px]">
                ✕
              </span>
              {g}
            </div>
          ))}

        {isDone && (
          <ResultOverlay
            result={state.result}
            movieTitle={puzzle.title}
            posterUrl={puzzle.posterUrl}
            imdbId={puzzle.imdbId}
            difficulty={state.revealedDifficulty}
            onNext={handleNext}
            isEndless
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```
Expected: all tests PASS.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

1. Navigate to `/play`.
2. Confirm genre chip row appears between the score line and the clue card.
3. Tap "Horror 👻" — a horror movie loads, score stays the same.
4. Tap "Horror 👻" again — resets to "All", a new movie loads.
5. Tap "90s 💾" — a 90s movie loads.
6. Tap "All" — resets.
7. Play a round to completion, then tap "Next" — next movie respects the active filter.
8. Switch filter mid-session — score does not reset.
9. Verify dark mode looks correct.

- [ ] **Step 5: Commit**

```bash
git add src/pages/EndlessPage.tsx
git commit -m "feat: add genre/decade filter chips to Endless mode"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Genre chips in Endless, above clue | Task 6 |
| Single-select, tap active to reset | Task 4 (component) + Task 6 |
| All chip is default | Task 4 |
| Seasonal pack chip (orange, LIVE badge) | Task 4 |
| Pack shown first, then All, then genres, then decades | Task 4 |
| Score carries over on filter change | Task 6 — `handleFilterSelect` does not reset score |
| Pack from hardcoded config | Task 2 (`packs.ts`) |
| `getActivePack()` date range logic | Task 2 (tests cover start/end/within/outside) |
| RPC: `p_genre`, `p_decade`, `p_included_ids` params | Task 1 |
| Empty pool message with filter name | Task 6 |
| Filter → RPC param mapping | Task 5 |
| `004_genre_decade_filter_rpc.sql` migration file | Task 1 |

All requirements covered. ✓

**Type consistency check:**

- `ActiveFilter` defined in `src/types/index.ts` (Task 3), used in `useEndlessGame` (Task 5) and `EndlessPage` (Task 6). ✓
- `FilterOption.genreValue` / `FilterOption.decadeValue` accessed with `!` assertion only after checking `opt.kind`. ✓
- `SeasonalPack` imported from `../config/packs` in both `GenreFilter.tsx` and `EndlessPage.tsx`. ✓
- `GENRE_FILTERS` imported from `../config/genres` in both `GenreFilter.tsx` and `EndlessPage.tsx`. ✓

**Placeholder scan:** No TBDs, TODOs, or vague steps. All code blocks are complete. ✓
