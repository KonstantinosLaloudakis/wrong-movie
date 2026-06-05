# Spotlight Mode — Design Spec

**Date:** 2026-06-05
**Status:** Approved
**Author:** Solo developer (side project)

---

## Overview

Spotlight Mode is an on-demand game mode where players work through all available movies for a specific actor or director. Unlike Endless (random, unbounded) and Daily (one puzzle, shared), Spotlight is curated and completable — you know the frame going in, which changes the guessing strategy.

Available as a new top-level nav tab alongside Daily and Endless.

---

## 1. Routing & Navigation

| Route | Page | Purpose |
|---|---|---|
| `/spotlight` | `SpotlightPage` | Browse grid — pick an actor or director |
| `/spotlight/:id` | `SpotlightPlayPage` | Play through all movies for that spotlight |

`id` is a kebab-case slug from the config (e.g. `tom-hanks`, `nolan`). The nav gains a third tab: **Daily | Endless | Spotlight**.

---

## 2. Config

**`src/config/spotlights.ts`**

```ts
export type SpotlightType = 'actor' | 'director';

export interface SpotlightConfig {
  id: string;            // URL slug, e.g. 'tom-hanks'
  name: string;          // Display name, e.g. 'Tom Hanks'
  type: SpotlightType;
  actorId?: string;      // UUID from actors table (actor spotlights only)
  directorName?: string; // Matches director_name on movies (director spotlights only)
}

export const SPOTLIGHTS: SpotlightConfig[] = [
  // Actors
  { id: 'tom-hanks',        name: 'Tom Hanks',           type: 'actor',    actorId: '...' },
  { id: 'meryl-streep',     name: 'Meryl Streep',        type: 'actor',    actorId: '...' },
  { id: 'denzel-washington',name: 'Denzel Washington',   type: 'actor',    actorId: '...' },
  // Directors
  { id: 'nolan',    name: 'Christopher Nolan', type: 'director', directorName: 'Christopher Nolan' },
  { id: 'kubrick',  name: 'Stanley Kubrick',   type: 'director', directorName: 'Stanley Kubrick' },
];
```

Adding a new spotlight = one new entry in this array + a redeploy. The catalog lives in source, so a deploy is always required to publish a new spotlight.

---

## 3. Data Layer

### Schema addition

```sql
ALTER TABLE movies ADD COLUMN director_name text;
```

Populated by the pipeline from TMDb's `/movie/{id}/credits` response — the director is already returned in the `crew` array under `job = 'Director'`. One extra extraction step in `seed_movies.py`.

### New RPC — `get_spotlight_movies`

```sql
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
    m.id, m.title, m.normalized_title, m.alt_titles,
    m.poster_url, m.imdb_id, m.release_year,
    c_h.clue_text, c_m.clue_text, c_e.clue_text
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
```

Returns the full set ordered by release year (chronological play order). No exclusion of daily puzzle — in a spotlight context, playing the daily movie is fine.

---

## 4. Hook — `useSpotlightGame`

```ts
useSpotlightGame(spotlight: SpotlightConfig): {
  movies: SpotlightPuzzle[];
  currentIndex: number;
  currentPuzzle: SpotlightPuzzle | null;
  state: GameState;
  sessionScore: number;
  totalMovies: number;
  isComplete: boolean;
  submitGuess: (guess: string) => boolean;
  advance: () => void;
  movieTitles: string[];
}
```

- Fetches all movies in a single RPC call on mount (bounded set, no pagination needed).
- `advance()` increments `currentIndex` — no further fetching.
- On `isComplete`, saves result to localStorage under key `spotlight-result-{id}`:
  ```ts
  { score: number; maxScore: number; completedAt: string; perMovie: ('hard'|'medium'|'easy'|'miss')[] }
  ```

---

## 5. Pages

### `SpotlightPage` (browse, `/spotlight`)

- Sections: **Actors** and **Directors** (two grids).
- Each card: name, movie count, completion badge if previously played (`✓ 14/24`).
- Clicking a card navigates to `/spotlight/:id`.
- Movie count shown on each card. Fetched once on page load via a single `get_spotlight_movie_counts` RPC that returns `{ actor_id | director_name → count }` for all spotlights in one query. Falls back to "— movies" while loading.

### `SpotlightPlayPage` (play, `/spotlight/:id`)

- Reads `:id` param, looks up `SpotlightConfig` from `SPOTLIGHTS`. 404 if not found.
- Header: spotlight name, "Movie X of Y", live score.
- Progress bar: one segment per movie, coloured by outcome (green = hard, yellow = medium/easy, red = miss, indigo = current, grey = not yet played).
- Clue reveal + guess input: reuses `ClueDisplay`, `GuessInput`, `ResultOverlay` unchanged.
- On round end: `ResultOverlay` shows poster + answer, `onNext` calls `advance()`.
- On `isComplete`: replaces game area with final scorecard.

### Final Scorecard

```
Tom Hanks Spotlight · 18 / 24
🟢 🟡 🟢 🔴 🟢 🟢 🟡 🟢

[Share result]   [Back to Spotlights]
```

Share text (copy to clipboard):
```
🎬 Tom Hanks Spotlight
18/24 · wrongmovie.app/spotlight/tom-hanks
🟢🟡🟢🔴🟢🟢🟡🟢
```

Emoji key: 🟢 hard clue · 🟡 medium or easy · 🔴 missed

---

## 6. Files to Create / Modify

| File | Change |
|---|---|
| `src/config/spotlights.ts` | New — spotlight catalog |
| `src/hooks/useSpotlightGame.ts` | New — game hook |
| `src/pages/SpotlightPage.tsx` | New — browse grid |
| `src/pages/SpotlightPlayPage.tsx` | New — play page |
| `src/App.tsx` | Add nav tab + two routes |
| `supabase/migrations/005_spotlight_rpc.sql` | New — director_name column + RPC |
| `scripts/seed_movies.py` | Extract director from TMDb credits |

---

## 7. Out of Scope

- Difficulty/genre filters within a spotlight (play the full set as-is)
- Replaying a completed spotlight (badge shows final score; replay is a future consideration)
- Co-Star Mode (two actors who appeared together) — noted as future feature

---

## 8. Future: Co-Star Mode

Show 5+ movies featuring two specific actors who appeared together multiple times (e.g. Damon & Affleck, Depp & Bonham Carter). Clues use both actors' famous roles simultaneously. Uses the same spotlight infrastructure — just a new `SpotlightType = 'costar'` with two `actorId` fields and a JOIN on `movie_cast` requiring both actors present.
