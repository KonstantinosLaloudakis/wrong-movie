# Movie Title Autocomplete — Design Spec

**Date:** 2026-06-02  
**Status:** Approved

## Problem

Users must type the exact movie title character-by-character with no assistance. This creates friction, especially for long or slightly unusual titles.

## Decisions Made

| Question | Decision |
|---|---|
| Suggestion source | Only movies in the game's own Supabase database |
| Interaction on select | Fill input, user still clicks Guess |
| Minimum characters to trigger | 2 |
| Data loading strategy | Preload all titles on game start, filter client-side |
| Max suggestions shown | 6 |
| Search type | Case-insensitive substring match |

## Architecture

### 1. Supabase RPC — `get_movie_titles`

A new lightweight RPC that returns all movies in the database as `[{ id: string, title: string }]`. Called once on app load inside `useDailyPuzzle`. The result is stored in a new `movieTitles` field returned from the hook.

No additional auth or RLS changes required — movie titles are not sensitive.

If the RPC fails, `movieTitles` stays as `[]` and autocomplete simply doesn't appear — the game remains fully playable without it.

### 2. `useMovieSuggestions` hook

**Location:** `src/hooks/useMovieSuggestions.ts`

**Inputs:**
- `titles: string[]` — the preloaded list from Supabase
- `query: string` — current input value

**Output:** `string[]` — up to 6 filtered titles

**Logic:**
- Return empty array if `query.length < 2`
- Filter `titles` where `title.toLowerCase().includes(query.toLowerCase())`
- Return first 6 matches

### 3. `GuessInput.tsx` — extended

**New props:**
- `suggestions: string[]` — filtered list from `useMovieSuggestions`
- `onSuggestionSelect: (title: string) => void` — called when user clicks a suggestion

**Behaviour:**
- Dropdown renders below the input when `suggestions.length > 0`
- Each suggestion highlights the matching substring (wrap match in `<mark>` or styled `<span>`)
- Clicking a suggestion calls `onSuggestionSelect(title)`, which sets the input value — it does **not** submit
- Keyboard: `ArrowDown` / `ArrowUp` navigate the list, `Enter` selects focused item (fills input only), `Escape` closes dropdown
- Clicking outside the dropdown closes it (blur / mousedown-outside handler)

### 4. `DailyPage.tsx` — wiring

- Receives `movieTitles` from `useDailyPuzzle`
- Maintains local `inputValue` state (lifted from `GuessInput` so `DailyPage` can set it when a suggestion is selected)
- Passes `suggestions` (derived via `useMovieSuggestions`) and `onSuggestionSelect` into `GuessInput`

### 5. `useDailyPuzzle.ts` — extended

- Calls `get_movie_titles` RPC alongside `get_daily_puzzle` on mount
- Stores result in `movieTitles: string[]` state
- Exposes `movieTitles` in the hook's return value

## Data Flow

```
App load
  → useDailyPuzzle calls get_movie_titles RPC
  → movieTitles[] stored in hook state

User types in GuessInput
  → DailyPage passes inputValue + movieTitles to useMovieSuggestions
  → useMovieSuggestions returns filtered suggestions[]
  → GuessInput renders dropdown

User clicks suggestion
  → onSuggestionSelect(title) called
  → DailyPage sets inputValue to title
  → GuessInput shows filled title, Guess button enabled

User clicks Guess
  → Normal submitGuess flow, unchanged
```

## What Does Not Change

- `guessMatch.ts` / `isCorrectGuess` — unchanged, still handles fuzzy matching and normalization
- `ResultOverlay`, `ClueDisplay`, `StatsModal` — untouched
- Endless mode — out of scope for this spec; can be added later with the same hook

## Out of Scope

- Auto-submitting on suggestion select
- Showing suggestions from external APIs (TMDb etc.)
- Endless mode autocomplete
