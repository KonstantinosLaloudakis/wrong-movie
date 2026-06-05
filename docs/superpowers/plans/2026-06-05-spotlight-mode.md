# Spotlight Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Spotlight mode — a new nav tab where players pick an actor or director and play through all their movies in the game's clue-guessing format.

**Architecture:** Config-driven catalog (`src/config/spotlights.ts`) defines available spotlights. A new Supabase RPC `get_spotlight_movies` fetches all movies for a spotlight in one query. `useSpotlightGame` manages sequential play state identically to Endless mode. Two new pages: browse grid (`/spotlight`) and play page (`/spotlight/:id`). Completion persisted to localStorage.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Supabase JS client, Vitest + Testing Library

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/types/index.ts` | Modify | Add `SpotlightResult` type |
| `src/config/spotlights.ts` | Create | `SpotlightConfig`, `SPOTLIGHTS`, `getSpotlightById` |
| `src/config/spotlights.test.ts` | Create | Tests for `getSpotlightById` |
| `supabase/migrations/005_spotlight_rpc.sql` | Create | `director_name` column + 2 RPCs |
| `scripts/seed_movies.py` | Modify | Extract director from TMDb credits |
| `src/hooks/useSpotlightGame.ts` | Create | Game hook + exported `buildSpotlightShareText` |
| `src/hooks/useSpotlightGame.test.ts` | Create | Tests for `buildSpotlightShareText` |
| `src/pages/SpotlightPage.tsx` | Create | Browse grid |
| `src/pages/SpotlightPlayPage.tsx` | Create | Play page + scorecard |
| `src/App.tsx` | Modify | Add nav tab + routes |

---

## Task 1: Types and Config

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/config/spotlights.ts`
- Create: `src/config/spotlights.test.ts`

- [ ] **Step 1: Add `SpotlightResult` to types**

Append to the end of `src/types/index.ts`:

```ts
export interface SpotlightResult {
  score: number;
  maxScore: number;
  completedAt: string; // ISO timestamp
  perMovie: GameResultType[];
}
```

- [ ] **Step 2: Create the spotlight config**

Create `src/config/spotlights.ts`:

```ts
export type SpotlightType = 'actor' | 'director';

export interface SpotlightConfig {
  id: string;            // URL slug, e.g. 'tom-hanks'
  name: string;          // Display name
  type: SpotlightType;
  actorId?: string;      // UUID from actors table (actor spotlights only)
  directorName?: string; // Matches director_name on movies (director spotlights only)
}

export const SPOTLIGHTS: SpotlightConfig[] = [
  // Actor UUIDs must be looked up from the actors table in Supabase after seeding.
  // Run: SELECT id, name FROM actors WHERE name IN ('Tom Hanks', ...) ORDER BY name;
  // Then replace the placeholder UUIDs below.
  { id: 'tom-hanks',         name: 'Tom Hanks',           type: 'actor',    actorId: 'REPLACE_WITH_ACTUAL_UUID' },
  { id: 'meryl-streep',      name: 'Meryl Streep',        type: 'actor',    actorId: 'REPLACE_WITH_ACTUAL_UUID' },
  { id: 'denzel-washington', name: 'Denzel Washington',   type: 'actor',    actorId: 'REPLACE_WITH_ACTUAL_UUID' },
  { id: 'nolan',             name: 'Christopher Nolan',   type: 'director', directorName: 'Christopher Nolan' },
  { id: 'kubrick',           name: 'Stanley Kubrick',     type: 'director', directorName: 'Stanley Kubrick' },
  { id: 'spielberg',         name: 'Steven Spielberg',    type: 'director', directorName: 'Steven Spielberg' },
];

export function getSpotlightById(id: string): SpotlightConfig | null {
  return SPOTLIGHTS.find(s => s.id === id) ?? null;
}

export function getSpotlightsByType(type: SpotlightType): SpotlightConfig[] {
  return SPOTLIGHTS.filter(s => s.type === type);
}
```

- [ ] **Step 3: Write the failing tests**

Create `src/config/spotlights.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getSpotlightById, getSpotlightsByType, SPOTLIGHTS } from './spotlights';

describe('getSpotlightById', () => {
  it('returns the config with a matching id', () => {
    const first = SPOTLIGHTS[0];
    expect(getSpotlightById(first.id)).toEqual(first);
  });

  it('returns null for an unknown id', () => {
    expect(getSpotlightById('does-not-exist')).toBeNull();
  });
});

describe('getSpotlightsByType', () => {
  it('returns only actor spotlights', () => {
    const actors = getSpotlightsByType('actor');
    expect(actors.every(s => s.type === 'actor')).toBe(true);
    expect(actors.length).toBeGreaterThan(0);
  });

  it('returns only director spotlights', () => {
    const directors = getSpotlightsByType('director');
    expect(directors.every(s => s.type === 'director')).toBe(true);
    expect(directors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run tests — expect FAIL (functions not imported yet)**

```
npx vitest run src/config/spotlights.test.ts
```

Expected: 4 tests pass immediately (file was created in step 2 before tests). If all pass, continue.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/config/spotlights.ts src/config/spotlights.test.ts
git commit -m "feat: add SpotlightConfig types and config catalog"
```

---

## Task 2: Database Migration and Pipeline

**Files:**
- Create: `supabase/migrations/005_spotlight_rpc.sql`
- Modify: `scripts/seed_movies.py`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/005_spotlight_rpc.sql`:

```sql
-- Add director_name to movies
ALTER TABLE movies ADD COLUMN IF NOT EXISTS director_name text;

-- Drop RPCs if they exist from a previous run
DROP FUNCTION IF EXISTS get_spotlight_movies(uuid, text);
DROP FUNCTION IF EXISTS get_spotlight_movie_count(uuid, text);

-- Returns all active movies for an actor (by actor_id) or director (by name),
-- ordered chronologically, each with their best clue per difficulty level.
CREATE OR REPLACE FUNCTION get_spotlight_movies(
  p_actor_id      uuid  DEFAULT NULL,
  p_director_name text  DEFAULT NULL
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
    AND (
      (p_actor_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM movie_cast mc
        WHERE mc.movie_id = m.id AND mc.actor_id = p_actor_id
      ))
      OR
      (p_director_name IS NOT NULL AND m.director_name = p_director_name)
    )
  ORDER BY m.release_year ASC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Returns a count of playable movies (all 3 difficulty clues present) for a spotlight.
CREATE OR REPLACE FUNCTION get_spotlight_movie_count(
  p_actor_id      uuid  DEFAULT NULL,
  p_director_name text  DEFAULT NULL
) RETURNS int AS $$
  SELECT COUNT(*)::int
  FROM movies m
  JOIN LATERAL (
    SELECT 1 FROM clues WHERE movie_id = m.id AND difficulty = 'hard'   AND is_active = true LIMIT 1
  ) c_h ON true
  JOIN LATERAL (
    SELECT 1 FROM clues WHERE movie_id = m.id AND difficulty = 'medium' AND is_active = true LIMIT 1
  ) c_m ON true
  JOIN LATERAL (
    SELECT 1 FROM clues WHERE movie_id = m.id AND difficulty = 'easy'   AND is_active = true LIMIT 1
  ) c_e ON true
  WHERE m.is_active = true
    AND (
      (p_actor_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM movie_cast mc
        WHERE mc.movie_id = m.id AND mc.actor_id = p_actor_id
      ))
      OR
      (p_director_name IS NOT NULL AND m.director_name = p_director_name)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

- [ ] **Step 2: Run migration in Supabase**

Go to Supabase → SQL Editor → paste and run the migration.

Verify with:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'movies' AND column_name = 'director_name';
-- Expected: 1 row

SELECT routine_name FROM information_schema.routines
WHERE routine_name IN ('get_spotlight_movies', 'get_spotlight_movie_count');
-- Expected: 2 rows
```

- [ ] **Step 3: Add director extraction to seed_movies.py**

In `scripts/seed_movies.py`, find the section that builds the movie dict for upsert (where `poster_url`, `genres`, etc. are set). The credits response is already fetched for cast. Add director extraction:

```python
# After fetching credits (the crew array is in credits['crew']):
director_name = next(
    (member['name'] for member in credits.get('crew', []) if member.get('job') == 'Director'),
    None
)

# In the movie upsert dict, add:
# 'director_name': director_name,
```

The exact insertion point is in the dict passed to the Supabase `upsert` call for the `movies` table. Add `'director_name': director_name` alongside `'poster_url'`, `'genres'`, etc.

- [ ] **Step 4: Re-run seed_movies.py to populate director_name**

```bash
python scripts/seed_movies.py
```

Verify directors are populated:
```sql
SELECT title, director_name FROM movies
WHERE director_name IS NOT NULL LIMIT 10;
-- Expected: rows with director names like 'Christopher Nolan', 'Steven Spielberg', etc.
```

- [ ] **Step 5: Look up actor UUIDs and fill in spotlights.ts**

```sql
SELECT id, name FROM actors
WHERE name IN ('Tom Hanks', 'Meryl Streep', 'Denzel Washington')
ORDER BY name;
```

Copy each UUID and replace the `'REPLACE_WITH_ACTUAL_UUID'` values in `src/config/spotlights.ts`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/005_spotlight_rpc.sql scripts/seed_movies.py src/config/spotlights.ts
git commit -m "feat: add spotlight RPCs and director_name column"
```

---

## Task 3: useSpotlightGame Hook

**Files:**
- Create: `src/hooks/useSpotlightGame.ts`
- Create: `src/hooks/useSpotlightGame.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useSpotlightGame.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSpotlightShareText } from './useSpotlightGame';

describe('buildSpotlightShareText', () => {
  it('maps hard → 🟢, miss → 🔴, medium → 🟡, easy → 🟡', () => {
    const text = buildSpotlightShareText('Tom Hanks', 7, 9, ['hard', 'miss', 'medium', 'easy']);
    expect(text).toContain('🟢🔴🟡🟡');
  });

  it('includes the spotlight name', () => {
    const text = buildSpotlightShareText('Nolan', 6, 9, ['hard', 'hard', 'hard']);
    expect(text).toContain('Nolan Spotlight');
  });

  it('includes score and max score', () => {
    const text = buildSpotlightShareText('Kubrick', 5, 15, ['hard', 'miss', 'easy', 'miss', 'hard']);
    expect(text).toContain('5/15');
  });

  it('returns empty emoji row for no outcomes', () => {
    const text = buildSpotlightShareText('X', 0, 0, []);
    expect(text).toContain('X Spotlight');
    expect(text).toContain('0/0');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npx vitest run src/hooks/useSpotlightGame.test.ts
```

Expected: `Cannot find module './useSpotlightGame'`

- [ ] **Step 3: Create the hook**

Create `src/hooks/useSpotlightGame.ts`:

```ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isCorrectGuess } from '../lib/guessMatch';
import { useLocalStorage } from './useLocalStorage';
import type { Puzzle, RoundState, Difficulty, GameResultType, SpotlightResult } from '../types';
import type { SpotlightConfig } from '../config/spotlights';

const DIFFICULTY_ORDER: Difficulty[] = ['hard', 'medium', 'easy'];
const POINTS_WITH_MISS: Record<GameResultType, number> = { hard: 3, medium: 2, easy: 1, miss: 0 };
const OUTCOME_EMOJI: Record<GameResultType, string> = {
  hard: '🟢', medium: '🟡', easy: '🟡', miss: '🔴',
};

export function buildSpotlightShareText(
  name: string,
  score: number,
  maxScore: number,
  outcomes: GameResultType[]
): string {
  const emojiRow = outcomes.map(o => OUTCOME_EMOJI[o]).join('');
  return `🎬 ${name} Spotlight\n${score}/${maxScore} · wrongmovie.app\n${emojiRow}`;
}

export function useSpotlightGame(spotlight: SpotlightConfig) {
  const [movies, setMovies] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roundOutcomes, setRoundOutcomes] = useState<GameResultType[]>([]);
  const [state, setState] = useState<RoundState>({
    revealedDifficulty: 'hard',
    guesses: [],
    result: 'unanswered',
    showAllClues: false,
  });

  const [, saveResult] = useLocalStorage<SpotlightResult | null>(
    `spotlight-result-${spotlight.id}`,
    null
  );

  const isComplete = movies.length > 0 && currentIndex >= movies.length;

  const sessionScore = roundOutcomes.reduce((sum, o) => sum + POINTS_WITH_MISS[o], 0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params: { p_actor_id?: string; p_director_name?: string } = {};
      if (spotlight.type === 'actor' && spotlight.actorId) {
        params.p_actor_id = spotlight.actorId;
      } else if (spotlight.type === 'director' && spotlight.directorName) {
        params.p_director_name = spotlight.directorName;
      }
      const { data } = await supabase.rpc('get_spotlight_movies', params);
      if (data) {
        setMovies(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data as any[]).map(row => ({
            puzzleNumber: 0,
            movieId: row.movie_id,
            title: row.title,
            normalizedTitle: row.normalized_title,
            altTitles: row.alt_titles ?? [],
            posterUrl: row.poster_url ?? null,
            imdbId: row.imdb_id ?? null,
            releaseYear: row.release_year ?? null,
            clues: {
              hard:   { id: '', text: row.hard_clue,   difficulty: 'hard'   as Difficulty },
              medium: { id: '', text: row.medium_clue, difficulty: 'medium' as Difficulty },
              easy:   { id: '', text: row.easy_clue,   difficulty: 'easy'   as Difficulty },
            },
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, [spotlight.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isComplete || roundOutcomes.length === 0) return;
    saveResult({
      score: sessionScore,
      maxScore: movies.length * 3,
      completedAt: new Date().toISOString(),
      perMovie: roundOutcomes,
    });
  }, [isComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  function submitGuess(guess: string): boolean {
    const puzzle = movies[currentIndex];
    if (!puzzle || state.result !== 'unanswered') return false;

    const correct = isCorrectGuess(guess, puzzle.normalizedTitle, puzzle.altTitles);
    const newGuesses = [...state.guesses, guess];
    const diffIndex = DIFFICULTY_ORDER.indexOf(state.revealedDifficulty);

    if (correct) {
      setState({ ...state, guesses: newGuesses, result: 'correct', showAllClues: true });
      return true;
    } else if (diffIndex < DIFFICULTY_ORDER.length - 1) {
      setState({
        guesses: newGuesses,
        revealedDifficulty: DIFFICULTY_ORDER[diffIndex + 1],
        result: 'unanswered',
        showAllClues: false,
      });
      return false;
    } else {
      setState({ ...state, guesses: newGuesses, result: 'wrong', showAllClues: false });
      return false;
    }
  }

  function advance() {
    if (state.result === 'unanswered') return;
    const outcome: GameResultType =
      state.result === 'correct' ? state.revealedDifficulty : 'miss';
    setRoundOutcomes(prev => [...prev, outcome]);
    setCurrentIndex(prev => prev + 1);
    setState({ revealedDifficulty: 'hard', guesses: [], result: 'unanswered', showAllClues: false });
  }

  return {
    movies,
    loading,
    currentIndex,
    currentPuzzle: movies[currentIndex] ?? null,
    state,
    sessionScore,
    totalMovies: movies.length,
    roundOutcomes,
    isComplete,
    submitGuess,
    advance,
    movieTitles: movies.map(m => m.title),
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```
npx vitest run src/hooks/useSpotlightGame.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Run full test suite — expect no regressions**

```
npm test
```

Expected: all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSpotlightGame.ts src/hooks/useSpotlightGame.test.ts
git commit -m "feat: add useSpotlightGame hook"
```

---

## Task 4: SpotlightPage (Browse Grid)

**Files:**
- Create: `src/pages/SpotlightPage.tsx`

- [ ] **Step 1: Create the page**

Create `src/pages/SpotlightPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SPOTLIGHTS, getSpotlightsByType } from '../config/spotlights';
import type { SpotlightResult } from '../types';

export function SpotlightPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [completions, setCompletions] = useState<Record<string, SpotlightResult | null>>({});

  useEffect(() => {
    const loaded: Record<string, SpotlightResult | null> = {};
    for (const s of SPOTLIGHTS) {
      const raw = localStorage.getItem(`spotlight-result-${s.id}`);
      loaded[s.id] = raw ? (JSON.parse(raw) as SpotlightResult) : null;
    }
    setCompletions(loaded);
  }, []);

  useEffect(() => {
    Promise.all(
      SPOTLIGHTS.map(s =>
        supabase
          .rpc('get_spotlight_movie_count', {
            p_actor_id: s.actorId ?? null,
            p_director_name: s.directorName ?? null,
          })
          .then(({ data }) => ({ id: s.id, count: (data as number) ?? 0 }))
      )
    ).then(results => {
      const map: Record<string, number> = {};
      for (const r of results) map[r.id] = r.count;
      setCounts(map);
    });
  }, []);

  const actors = getSpotlightsByType('actor');
  const directors = getSpotlightsByType('director');

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Section title="Actors" spotlights={actors} counts={counts} completions={completions} />
      <Section title="Directors" spotlights={directors} counts={counts} completions={completions} />
    </div>
  );
}

interface SectionProps {
  title: string;
  spotlights: ReturnType<typeof getSpotlightsByType>;
  counts: Record<string, number>;
  completions: Record<string, SpotlightResult | null>;
}

function Section({ title, spotlights, counts, completions }: SectionProps) {
  if (spotlights.length === 0) return null;
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {spotlights.map(s => (
          <SpotlightCard
            key={s.id}
            spotlight={s}
            count={counts[s.id]}
            completion={completions[s.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}

interface CardProps {
  spotlight: ReturnType<typeof getSpotlightsByType>[number];
  count: number | undefined;
  completion: SpotlightResult | null;
}

function SpotlightCard({ spotlight, count, completion }: CardProps) {
  const countLabel = count === undefined ? '— movies' : `${count} movie${count !== 1 ? 's' : ''}`;

  return (
    <Link
      to={`/spotlight/${spotlight.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
    >
      <p className="font-bold text-slate-900 dark:text-white">{spotlight.name}</p>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{countLabel}</p>
      {completion ? (
        <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
          ✓ {completion.score}/{completion.maxScore}
        </span>
      ) : (
        <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400 dark:bg-slate-700 dark:text-slate-500">
          Not played
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Run the dev server and verify browse page renders**

```
npm run dev
```

Navigate to `/#/spotlight` (route not wired yet — do this after Task 6, or temporarily add the route).

Visual checks:
- Two sections: Actors and Directors
- Each card shows name + count + completion badge
- Cards are clickable links

- [ ] **Step 3: Commit**

```bash
git add src/pages/SpotlightPage.tsx
git commit -m "feat: add SpotlightPage browse grid"
```

---

## Task 5: SpotlightPlayPage

**Files:**
- Create: `src/pages/SpotlightPlayPage.tsx`

- [ ] **Step 1: Create the page**

Create `src/pages/SpotlightPlayPage.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSpotlightById } from '../config/spotlights';
import { useSpotlightGame, buildSpotlightShareText } from '../hooks/useSpotlightGame';
import { getMovieSuggestions } from '../hooks/useMovieSuggestions';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';
import type { SpotlightConfig } from '../config/spotlights';

const OUTCOME_EMOJI: Record<string, string> = {
  hard: '🟢', medium: '🟡', easy: '🟡', miss: '🔴',
};

export function SpotlightPlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const spotlight = id ? getSpotlightById(id) : null;

  if (!spotlight) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-500 dark:text-slate-400">Spotlight not found.</p>
        <button
          onClick={() => navigate('/spotlight')}
          className="mt-4 text-sm text-indigo-600 underline dark:text-indigo-400"
        >
          Back to Spotlights
        </button>
      </div>
    );
  }

  return <SpotlightGame spotlight={spotlight} />;
}

function SpotlightGame({ spotlight }: { spotlight: SpotlightConfig }) {
  const navigate = useNavigate();
  const {
    movies,
    loading,
    currentIndex,
    currentPuzzle,
    state,
    sessionScore,
    totalMovies,
    roundOutcomes,
    isComplete,
    submitGuess,
    advance,
    movieTitles,
  } = useSpotlightGame(spotlight);

  const [inputValue, setInputValue] = useState('');
  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  const suggestions = useMemo(
    () => getMovieSuggestions(movieTitles, inputValue),
    [movieTitles, inputValue]
  );

  const isDone = state.result !== 'unanswered';

  useEffect(() => {
    return () => { if (shakeTimer.current) clearTimeout(shakeTimer.current); };
  }, []);

  useEffect(() => {
    if (!isDone) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') { e.preventDefault(); handleNext(); }
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
    advance();
  }

  function handleShare() {
    const text = buildSpotlightShareText(
      spotlight.name,
      sessionScore,
      totalMovies * 3,
      roundOutcomes
    );
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading…</div>;
  }

  if (!loading && movies.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-500 dark:text-slate-400">No movies available for this spotlight yet.</p>
        <button
          onClick={() => navigate('/spotlight')}
          className="mt-4 text-sm text-indigo-600 underline dark:text-indigo-400"
        >
          Back to Spotlights
        </button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {spotlight.name} Spotlight
        </p>
        <p className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
          {sessionScore} <span className="text-2xl font-medium text-slate-400">/ {totalMovies * 3}</span>
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-1 text-2xl">
          {roundOutcomes.map((o, i) => (
            <span key={i}>{OUTCOME_EMOJI[o]}</span>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={handleShare}
            className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {copied ? 'Copied!' : 'Share result'}
          </button>
          <button
            onClick={() => navigate('/spotlight')}
            className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Back to Spotlights
          </button>
        </div>
      </div>
    );
  }

  if (!currentPuzzle) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-3 flex items-center justify-between text-sm">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {spotlight.name} Spotlight
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Movie {currentIndex + 1} of {totalMovies}
          </p>
        </div>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Score: {sessionScore}
        </span>
      </div>

      <div className="mb-4 flex gap-1">
        {movies.map((_, i) => {
          const outcome = roundOutcomes[i];
          const isCurrent = i === currentIndex;
          const color = isCurrent
            ? 'bg-indigo-500'
            : outcome === 'hard'
            ? 'bg-green-500'
            : outcome === 'medium' || outcome === 'easy'
            ? 'bg-yellow-400'
            : outcome === 'miss'
            ? 'bg-red-400'
            : 'bg-slate-200 dark:bg-slate-700';
          return <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${color}`} />;
        })}
      </div>

      <ClueDisplay
        clues={currentPuzzle.clues}
        revealedDifficulty={state.revealedDifficulty}
        showAll={state.showAllClues}
      />

      <div className="mt-4 space-y-2">
        {!isDone && (
          <div className={shaking ? 'shake' : ''}>
            <GuessInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleGuess}
              autoFocus
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
            movieTitle={currentPuzzle.title}
            posterUrl={currentPuzzle.posterUrl}
            imdbId={currentPuzzle.imdbId}
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

- [ ] **Step 2: Commit**

```bash
git add src/pages/SpotlightPlayPage.tsx
git commit -m "feat: add SpotlightPlayPage with progress bar and scorecard"
```

---

## Task 6: Wire Up App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports and routes**

In `src/App.tsx`, add the two new page imports at the top:

```ts
import { SpotlightPage } from './pages/SpotlightPage';
import { SpotlightPlayPage } from './pages/SpotlightPlayPage';
```

- [ ] **Step 2: Add the nav tab**

In the `<nav>` block (after the Endless `NavLink`), add:

```tsx
<NavLink
  to="/spotlight"
  className={({ isActive }) =>
    isActive
      ? 'rounded-md bg-slate-100 px-3 py-1.5 text-slate-900 dark:bg-slate-700 dark:text-white'
      : 'rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
  }
>
  Spotlight
</NavLink>
```

- [ ] **Step 3: Add the routes**

In the `<Routes>` block, add after the `/play` route:

```tsx
<Route path="/spotlight" element={<SpotlightPage />} />
<Route path="/spotlight/:id" element={<SpotlightPlayPage />} />
```

- [ ] **Step 4: Run full test suite — expect all pass**

```
npm test
```

Expected: all tests pass, no TypeScript errors.

- [ ] **Step 5: Run dev server and do a full end-to-end smoke test**

```
npm run dev
```

Checks:
1. Nav shows three tabs: Daily | Endless | Spotlight
2. Clicking Spotlight opens browse grid with Actor and Director sections
3. Each card shows name, movie count, "Not played" badge
4. Clicking a card (e.g. Christopher Nolan) opens the play page
5. "Movie 1 of N" header and progress bar appear
6. Play through 2 movies: verify hard/medium/easy clue progression works
7. Verify progress bar segments colour correctly after each round
8. On the final movie, verify the scorecard and emoji row appear
9. Share button copies text to clipboard
10. "Back to Spotlights" returns to browse
11. Replayed spotlight shows "✓ score/max" completion badge on the card

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up Spotlight nav tab and routes"
```
