# Genre & Decade Filters + Seasonal Packs — Design Spec

**Date:** 2026-06-04
**Status:** Approved
**Author:** Solo developer (side project)

---

## Overview

Add a genre/decade filter row to the top of Endless mode. Players can tap a chip to restrict the random movie pool to a specific genre (Horror, Sci-Fi, etc.) or decade (80s, 90s, 2000s). A seasonal pack chip appears automatically when a pack is active, pulling from a hardcoded frontend config — no DB changes needed for packs.

---

## 1. User-Facing Behaviour

### Genre/Decade chips

- Rendered as a scrollable/wrapping chip row at the top of the Endless page, above the clue card.
- Default state: "All" chip is active — existing behaviour unchanged.
- Tap a chip → that filter activates, the **current movie is abandoned**, and the next `fetchNext` call uses the new filter.
- Tap the active chip again, or tap "All" → filter resets to all movies.
- **Score carries over** when switching filters — no reset.
- Only one chip active at a time (single-select).

### Chip order

```
[🎃 Horror Week LIVE]  ← seasonal pack, only when active
[All]
[Action 💥] [Animation 🎨] [Comedy 😂] [Crime 🔫] [Drama 🎭]
[Fantasy ✨] [Horror 👻] [Romance 💕] [Sci-Fi 🚀] [Thriller 🔪]
[80s 📼] [90s 💾] [2000s 💿]
```

### Seasonal pack chip

- Styled distinctly: orange background, white text, "LIVE" badge.
- Selecting it restricts the pool to the pack's hardcoded `movieIds`.
- When no pack is active the chip is not rendered at all.

---

## 2. Data Layer — RPC Extension

### Migration: `004_genre_decade_filter_rpc.sql`

Drop and recreate `get_random_movie` with three new optional parameters:

```sql
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
    m.id, m.title, m.normalized_title, m.alt_titles, m.poster_url,
    m.imdb_id, m.release_year,
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

**Constraint:** only one of `p_genre`, `p_decade`, `p_included_ids` is non-null per call. Enforced by the frontend — no DB constraint needed.

---

## 3. Frontend Config Files

### `src/config/genres.ts`

```ts
export type FilterKind = 'genre' | 'decade';

export interface FilterOption {
  id: string;
  label: string;
  emoji: string;
  kind: FilterKind;
  genreValue?: string;  // TMDb genre string
  decadeValue?: number; // e.g. 1990
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

### `src/config/packs.ts`

```ts
export interface SeasonalPack {
  id: string;
  name: string;
  emoji: string;
  movieIds: string[];
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
}

export const SEASONAL_PACKS: SeasonalPack[] = [
  // Add packs here when running one, e.g.:
  // {
  //   id: 'horror-week-2026',
  //   name: 'Horror Week',
  //   emoji: '🎃',
  //   movieIds: ['uuid1', 'uuid2', ...],
  //   startDate: '2026-10-25',
  //   endDate:   '2026-11-01',
  // },
];

export function getActivePack(): SeasonalPack | null {
  const today = new Date().toISOString().slice(0, 10);
  return SEASONAL_PACKS.find(p => p.startDate <= today && today <= p.endDate) ?? null;
}
```

---

## 4. New Component: `GenreFilter`

**File:** `src/components/GenreFilter.tsx`

**Props:**
```ts
interface Props {
  activeId: string | null;          // 'horror', '90s', 'pack-id', or null (= All)
  onSelect: (id: string | null) => void;
  activePack: SeasonalPack | null;
}
```

**Render order:** pack chip (if active) → All → genre chips → decade chips.

**Chip behaviour:** clicking the already-active chip calls `onSelect(null)` to reset to All. Clicking any other chip calls `onSelect(chip.id)`.

**Seasonal pack chip styling:** orange background (`bg-orange-500`), white text, small "LIVE" badge — distinct from genre chips to draw attention.

**Dark mode:** follows existing Tailwind dark variants used throughout the app.

---

## 5. Hook Changes: `useEndlessGame`

Add `activeFilter` parameter:

```ts
function useEndlessGame(
  saveEndlessResult: (result: GameResultType) => void,
  activeFilter: { kind: 'genre'; genreValue: string }
            | { kind: 'decade'; decadeValue: number }
            | { kind: 'pack'; movieIds: string[] }
            | null
)
```

Inside `fetchNext`, derive the RPC params from `activeFilter`:

```ts
const rpcParams: {
  excluded_ids: string[];
  p_genre?: string;
  p_decade?: number;
  p_included_ids?: string[];
} = { excluded_ids: playedIds };

if (activeFilter?.kind === 'genre')  rpcParams.p_genre        = activeFilter.genreValue;
if (activeFilter?.kind === 'decade') rpcParams.p_decade       = activeFilter.decadeValue;
if (activeFilter?.kind === 'pack')   rpcParams.p_included_ids = activeFilter.movieIds;
```

No other changes to the hook — `fetchNext` already handles the rest.

---

## 6. Page Changes: `EndlessPage`

```tsx
const activePack = getActivePack();
const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

// Derive activeFilter object from id
const activeFilter = useMemo(() => {
  if (!activeFilterId) return null;
  if (activePack && activeFilterId === activePack.id) {
    return { kind: 'pack' as const, movieIds: activePack.movieIds };
  }
  const opt = GENRE_FILTERS.find(f => f.id === activeFilterId);
  if (!opt) return null;
  if (opt.kind === 'genre')  return { kind: 'genre'  as const, genreValue:  opt.genreValue! };
  if (opt.kind === 'decade') return { kind: 'decade' as const, decadeValue: opt.decadeValue! };
  return null;
}, [activeFilterId, activePack]);

function handleFilterSelect(id: string | null) {
  setActiveFilterId(id);
  // Abandon current puzzle and fetch next with the new filter
  fetchNext();  // useEndlessGame reads activeFilter via closure on next call
}
```

`<GenreFilter>` is rendered between the score row and `<ClueDisplay>`.

---

## 7. Empty-Pool Handling

If the filtered pool is exhausted (all matching movies have been played this session), `get_random_movie` returns no rows. `useEndlessGame` already handles a null puzzle response with "No more movies available". With a filter active, the message should read:

> "No more [Horror] movies available — try a different genre or switch to All."

The `activeFilter` label is passed into the empty-state message.

---

## 8. Out of Scope

- Persisting the active filter across sessions (localStorage) — not needed, Endless is stateless per session
- Stats breakdown by genre — not in this iteration
- Combining multiple genre chips (multi-select) — explicitly excluded; single-select only
- Adding/removing genres without a code deploy — config file is the update mechanism

---

## 9. Files Changed

| File | Change |
|---|---|
| `supabase/migrations/004_genre_decade_filter_rpc.sql` | New — extends `get_random_movie` RPC |
| `src/config/genres.ts` | New — curated filter config |
| `src/config/packs.ts` | New — seasonal pack config + `getActivePack()` |
| `src/components/GenreFilter.tsx` | New — chip row component |
| `src/hooks/useEndlessGame.ts` | Modified — accept and apply `activeFilter` |
| `src/pages/EndlessPage.tsx` | Modified — add filter state, render `<GenreFilter>` |
