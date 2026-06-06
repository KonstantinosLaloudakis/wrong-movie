# Double Take — Design Spec

**Date:** 2026-05-31
**Status:** Approved
**Author:** Solo developer (side project)

---

## Overview

Double Take is a web-based movie trivia quiz game. Players are shown a movie description that uses actors' famous roles from *other* movies instead of the actual characters from the movie being described. The challenge is to recognise the actors and map them back to the correct film.

**Example:**

> Movie: Eternal Sunshine of the Spotless Mind
>
> Clue (easy): "The Riddler hires Frodo to erase his ex from his memory."

---

## Constraints

- Solo developer, side project
- Free hosting only (GitHub Pages + Supabase free tier)
- No user authentication in MVP
- Python preferred for backend/pipeline work
- 4-week MVP target

---

## 1. Core Gameplay Loop

### Round structure

Each round presents one movie. Three clues exist per movie ordered hardest to easiest. The player sees one clue at a time.

1. Hard clue shown (abstract, no famous role names used directly)
2. Player submits a guess
3. Correct → round ends, points awarded
4. Wrong → medium clue revealed, try again
5. Wrong → easy clue revealed, try again
6. Wrong → round ends, movie title revealed, 0 points

Maximum 3 guesses per movie, one per difficulty tier.

### Scoring

| Clue used to guess correctly | Points |
|---|---|
| Hard | 3 |
| Medium | 2 |
| Easy | 1 |
| Missed | 0 |

### Guess matching (client-side)

- Case-insensitive
- Strip leading articles: The, A, An
- Levenshtein distance ≤ 2 for typo tolerance
- Strip punctuation for comparison
- `normalized_title` column in `movies` stores pre-computed normal form
- `alt_titles text[]` stores known variants (e.g. "Dark Knight" for "The Dark Knight Rises")

### Daily puzzle

- One movie per day, same for all players, seeded in advance
- Maximum 3 guesses, clues reveal progressively
- Shareable emoji result grid:
  ```
  Double Take 🎬 #42
  🔴🔴🟢
  Guessed on easy clue - 1pt
  doubletake.github.io
  ```
- Streak and daily completion status stored in localStorage keyed by date

### Endless mode

- Random movie drawn from active pool on each round
- Excludes current day's daily puzzle movie
- Excludes movies already played in the current session (tracked in memory)
- Session score accumulates, shown in UI, not persisted across sessions
- Player can stop at any time

### Hints (post-MVP)

After all 3 clues revealed, two bonus hints at no score cost:
- Show release year
- Show poster thumbnail

Schema already supports this — no architectural changes needed to add later.

---

## 2. Data Model

### `movies`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `title` | `text` | Canonical title |
| `normalized_title` | `text` | Lowercase, no articles, no punctuation |
| `alt_titles` | `text[]` | Known alternate guesses |
| `release_year` | `int` | |
| `tmdb_id` | `int` unique | Primary external reference |
| `imdb_id` | `text` | e.g. `tt0133093` |
| `plot_summary` | `text` | LLM input only, never displayed |
| `poster_url` | `text` | TMDb CDN URL |
| `genres` | `text[]` | e.g. `["Drama","Thriller"]` |
| `is_active` | `bool` default `true` | Toggle out of rotation without deleting |
| `created_at` | `timestamptz` | |

### `actors`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | |
| `tmdb_id` | `int` unique | |
| `created_at` | `timestamptz` | |

### `famous_roles`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `actor_id` | `uuid` FK → `actors` | |
| `role_name` | `text` | e.g. `Frodo` |
| `source_movie_title` | `text` | e.g. `The Lord of the Rings` |
| `source_movie_year` | `int` | Disambiguates remakes |
| `famousness_score` | `float` | 0–1, used to select best role per actor |
| `created_at` | `timestamptz` | |

One actor can have multiple rows. The highest `famousness_score` row is used in LLM prompts unless the source movie is in the active game pool (conflict case — use second highest).

### `movie_cast`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `movie_id` | `uuid` FK → `movies` | |
| `actor_id` | `uuid` FK → `actors` | |
| `character_name` | `text` | Actual role in this movie (LLM input) |
| `cast_order` | `int` | Billing order from TMDb |
| `created_at` | `timestamptz` | |

### `clues`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `movie_id` | `uuid` FK → `movies` | |
| `clue_text` | `text` | Generated description |
| `difficulty` | `enum('easy','medium','hard')` | |
| `quality_score` | `float` | LLM self-rated 0–1 confidence |
| `is_active` | `bool` default `true` | Filter bad clues without deleting |
| `generation_model` | `text` | e.g. `claude-haiku-4-5-20251001` |
| `created_at` | `timestamptz` | |

### `daily_puzzles`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `puzzle_date` | `date` unique | One per calendar day |
| `movie_id` | `uuid` FK → `movies` | |
| `clue_hard_id` | `uuid` FK → `clues` | Pinned for consistency |
| `clue_medium_id` | `uuid` FK → `clues` | |
| `clue_easy_id` | `uuid` FK → `clues` | |
| `puzzle_number` | `int` unique | Sequential (#1, #2…) for sharing |
| `created_at` | `timestamptz` | |

Clue IDs are pinned (not just difficulty + movie_id) so the daily puzzle never changes mid-day if clue data is updated.

---

## 3. Data Acquisition Strategy

### Primary: TMDb API

Free, requires registration, 40 req/10s rate limit.

Endpoints used:
- `/movie/popular`, `/movie/top_rated` — build movie list
- `/movie/{id}` — plot summary, poster, genres, IMDb ID
- `/movie/{id}/credits` — cast with character names and billing order
- `/person/{id}/movie_credits` — actor filmography for famous_roles

Attribution required: "This product uses the TMDb API but is not endorsed or certified by TMDb."

### Secondary: IMDb Non-Commercial Datasets

Free TSV dumps, no API key needed.

Files used:
- `name.basics.tsv` — `knownForTitles` field seeds `famous_roles` baseline
- `title.basics.tsv` — cross-reference movie metadata

Legal: non-commercial personal use only. Do not redistribute raw data.

### Famous roles ranking

```
famousness_score = tmdb_movie_popularity × (1 / cast_order)
```

Manual curation override for top ~50 actors where automated scoring gives wrong results.

### Pipeline scripts (local, run once)

```
scripts/
  seed_movies.py         # TMDb → movies, actors, movie_cast
  seed_famous_roles.py   # IMDb knownForTitles → famous_roles
  generate_clues.py      # Anthropic API → clues
  deduplicate_clues.py   # Embedding-based dedup pass
  schedule_daily.py      # Pre-seeds daily_puzzles table
```

All scripts are idempotent — safe to re-run without creating duplicates.

---

## 4. AI Clue Generation Pipeline

### Model

Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) via the Anthropic API (`console.anthropic.com`). Separate from Claude Pro subscription — requires API credits (~$1.50 one-time for 1,000 movies).

### Prompt structure

```
You are writing clues for a movie trivia game called "Double Take".

Rules:
- Describe the movie's plot using actors' FAMOUS ROLES from OTHER movies instead of actual character names
- Never mention the movie's actual title
- Never use the movie's actual character names
- Each clue must be 1-3 sentences
- A player who knows the actors should be able to figure out the real movie

Generate exactly 3 clues at different difficulty levels:

HARD: Describe the plot abstractly. Do NOT use the famous role names at all.
Use only conceptual descriptions (e.g. "a caped crusader's nemesis", "a fellowship's reluctant hero").

MEDIUM: Use indirect references to famous roles
(e.g. "a Gotham villain", "a hobbit-like figure").

EASY: Directly substitute famous role names for the actual characters
(e.g. "The Riddler hires Frodo to erase his ex from his memory").

Movie: {title} ({year})
Plot: {plot}

Cast:
{cast_lines}

Respond in JSON:
{
  "hard":   { "clue": "...", "confidence": 0.0-1.0 },
  "medium": { "clue": "...", "confidence": 0.0-1.0 },
  "easy":   { "clue": "...", "confidence": 0.0-1.0 }
}

Confidence = how likely a movie-literate player can solve this clue.
```

### Quality filters

| Check | Rule | Action |
|---|---|---|
| Confidence threshold | Score < 0.65 | Mark `is_active = false` |
| Title leak | Clue contains movie title | Reject always |
| Character name leak | Clue contains actual character name | Reject always |
| Too short | Clue < 20 characters | Reject |
| JSON parse failure | Malformed response | Retry once, then skip |

### Famous role conflict check

Before building each prompt, check if any actor's top-ranked `famous_role.source_movie` is in the active `movies` table. If so, use that actor's second-highest `famousness_score` role instead.

### Deduplication

After batch generation, run `deduplicate_clues.py`:
1. Generate embeddings for all `is_active = true` clues
2. For each movie, if two clues of the same difficulty have cosine similarity > 0.92, keep higher confidence score, deactivate the other

### Cost estimate

| Item | Tokens | Cost |
|---|---|---|
| 1,000 movies input | ~600K | ~$0.48 |
| 1,000 movies output | ~250K | ~$1.00 |
| **Total** | | **~$1.50** |

---

## 5. Tech Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | GitHub Pages |
| Database | PostgreSQL (Supabase free tier) | Supabase |
| Routing | React Router | — |
| DB client | `@supabase/supabase-js` (browser) | — |
| Pipeline | Python 3.11+ (`httpx`, `anthropic`, `supabase-py`) | Local only |
| CI/CD | GitHub Actions | GitHub |

No backend server deployed. All game logic runs client-side. Supabase is queried directly from the browser.

### Note on answer visibility

Movie titles are readable in network responses (no server-side validation). Acceptable for an MVP casual trivia game — not a competition.

---

## 6. Key Supabase Queries

### Fetch today's daily puzzle

```sql
SELECT dp.puzzle_number, dp.movie_id,
       c_hard.clue_text  AS hard,
       c_med.clue_text   AS medium,
       c_easy.clue_text  AS easy,
       m.title, m.normalized_title, m.alt_titles, m.poster_url
FROM daily_puzzles dp
JOIN clues c_hard ON dp.clue_hard_id   = c_hard.id
JOIN clues c_med  ON dp.clue_medium_id = c_med.id
JOIN clues c_easy ON dp.clue_easy_id   = c_easy.id
JOIN movies m     ON dp.movie_id       = m.id
WHERE dp.puzzle_date = CURRENT_DATE;
```

### Fetch random endless movie (excluding played)

```sql
SELECT m.id, m.title, m.normalized_title, m.alt_titles, m.poster_url,
       c_hard.clue_text, c_med.clue_text, c_easy.clue_text
FROM movies m
JOIN clues c_hard ON c_hard.movie_id = m.id AND c_hard.difficulty = 'hard'   AND c_hard.is_active
JOIN clues c_med  ON c_med.movie_id  = m.id AND c_med.difficulty  = 'medium' AND c_med.is_active
JOIN clues c_easy ON c_easy.movie_id = m.id AND c_easy.difficulty = 'easy'   AND c_easy.is_active
WHERE m.is_active = true
  AND m.id NOT IN (<played_ids>)
  AND m.id != (SELECT movie_id FROM daily_puzzles WHERE puzzle_date = CURRENT_DATE)
ORDER BY RANDOM()
LIMIT 1;
```

---

## 7. MVP 4-Week Roadmap

### Week 1 — Data foundation

- Set up Supabase project, run schema migrations
- `seed_movies.py` — fetch 100 movies from TMDb, store movies + actors + movie_cast
- `seed_famous_roles.py` — IMDb knownForTitles → famous_roles
- Manual review pass: fix wrong famous_role assignments for top cast
- `generate_clues.py` — generate 3 clues per movie, quality filter, write to Supabase
- `schedule_daily.py` — pre-seed daily_puzzles for next 30 days
- **Deliverable:** Supabase has 100 movies, ~300 clues, 30 days of daily puzzles

### Week 2 — Frontend core

- Scaffold React + Vite + Tailwind
- Set up Supabase JS client
- Build `DailyPuzzlePage`: fetch puzzle, clue reveal loop, guess input, result
- localStorage: daily completion, streak
- Mobile-first responsive layout
- **Deliverable:** Daily puzzle playable end-to-end in browser

### Week 3 — Endless mode + deployment

- Build `EndlessModePage`: random movie draw, session score, next movie flow
- React Router: `/` daily, `/play` endless, simple nav
- Share result component (emoji grid, copy to clipboard)
- GitHub Actions workflow: build + deploy to GitHub Pages on push to `main`
- **Deliverable:** Both modes live on GitHub Pages

### Week 4 — Polish + buffer

- Guess input polish: fuzzy match, article stripping, loading states
- Animations: clue reveal, correct/wrong feedback
- Mobile UX pass: tap targets, keyboard behaviour
- Error states: Supabase down, puzzle not found
- Expand to 200 movies (re-run pipeline)
- Schedule daily puzzles 60+ days ahead
- TMDb attribution in footer
- **Deliverable:** Presentable, shareable, stable

### Out of scope for MVP

Auth, leaderboards, multiplayer, hints (poster/year), TV/game modes, monetization.

---

## 8. Future Features

**High priority (low effort, high viral impact):**
- Actor streak badges
- Themed weeks / seasonal packs
- Hard mode (one guess on hard clue only)

**Gameplay extensions:**
- Reverse mode (shown movie title, guess which famous role is being used)
- TV show mode, video game mode, franchise packs
- Hints (poster, year) — already in schema

**Social/competitive (requires auth):**
- Leaderboards, Elo ranking
- Multiplayer (race to guess)
- User-submitted clues with community voting

---

## 9. Monetization (post-MVP)

| Option | Effort | Notes |
|---|---|---|
| Display ads (AdSense) | Low | Add after traffic established |
| Remove ads one-time purchase | Medium | $2–3, needs Stripe |
| Themed packs | Medium | $0.99–1.99 each |
| Subscription | High | Only viable with auth + high daily engagement |

Launch with no monetization. Add AdSense first once there is traffic.

---

## 10. Technical Challenges & Solutions

### Iconic role detection
**Score:** `tmdb_popularity × (1 / cast_order)`. Manual override for top 50 actors.

### Famous role conflicts
Before LLM prompt: if actor's top role is from a movie in the active pool, use their second-ranked role.

### Clue ambiguity
LLM confidence score filters most cases. Optional validation pass: ask LLM "what movie does this describe?" and flag mismatches.

### Title normalization
`normalized_title` column + `alt_titles[]` array. Levenshtein ≤ 2 fuzzy match client-side.

### Clue quality drift
Confidence threshold filter. Post-launch: feedback button flags `clue_id` for manual review.

### Copyright
Plot summaries used as LLM input only, never displayed. Posters hotlinked from TMDb CDN (allowed with attribution). Generated clues are original output. TMDb attribution in footer. IMDb data not redistributed.

### Daily puzzle integrity
localStorage only — no server validation. Acceptable for a casual game. Add Supabase anonymous sessions if integrity becomes important post-launch.

---

## 11. Full Architecture

```
OFFLINE PIPELINE (your laptop, run once)
  TMDb API          → seed_movies.py       → movies, actors, movie_cast
  IMDb name.basics  → seed_famous_roles.py → famous_roles
  Anthropic API     → generate_clues.py    → clues
                    → schedule_daily.py    → daily_puzzles

SUPABASE (free tier)
  PostgreSQL: movies | actors | famous_roles | movie_cast | clues | daily_puzzles

BROWSER (React + Vite)
  /       DailyPuzzlePage
            fetch daily_puzzles WHERE date = today
            guess logic (client-side)
            localStorage: streak, today's result
  /play   EndlessModePage
            fetch random movie (exclude played + daily)
            session score in memory

DEPLOYMENT
  git push → GitHub Actions → vite build → GitHub Pages
```

---

## 12. Cost Summary

| Item | Cost |
|---|---|
| GitHub Pages | $0/month |
| Supabase free tier | $0/month |
| TMDb API | $0/month |
| Anthropic API (1,000 movies, one-time) | ~$1.50 |
| **Ongoing total** | **$0/month** |

---

## 13. Recommended First 100 Movies

```
Classics & Drama
01. The Godfather (1972)          02. Schindler's List (1993)
03. Forrest Gump (1994)           04. Goodfellas (1990)
05. The Silence of the Lambs (1991) 06. The Shawshank Redemption (1994)
07. Fight Club (1999)             08. American Beauty (1999)
09. A Beautiful Mind (2001)       10. Gladiator (2000)

Sci-Fi & Action
11. The Matrix (1999)             12. Inception (2010)
13. Interstellar (2014)           14. The Terminator (1984)
15. Jurassic Park (1993)          16. Alien (1979)
17. Blade Runner (1982)           18. Back to the Future (1985)
19. Die Hard (1988)               20. Mad Max: Fury Road (2015)

Superhero
21. The Dark Knight (2008)        22. Iron Man (2008)
23. Avengers: Endgame (2019)      24. Spider-Man (2002)
25. Logan (2017)                  26. Black Panther (2018)
27. Guardians of the Galaxy (2014) 28. Wonder Woman (2017)
29. Doctor Strange (2016)         30. Thor (2011)

Comedy & Romance
31. Pulp Fiction (1994)           32. The Big Lebowski (1998)
33. Groundhog Day (1993)          34. Home Alone (1990)
35. Mrs. Doubtfire (1993)         36. Pretty Woman (1990)
37. Notting Hill (1999)           38. When Harry Met Sally (1989)
39. Four Weddings and a Funeral (1994) 40. Bridesmaids (2011)

Thriller & Mystery
41. Se7en (1995)                  42. The Usual Suspects (1995)
43. Memento (2000)                44. Zodiac (2007)
45. Gone Girl (2014)              46. Rear Window (1954)
47. Vertigo (1958)                48. The Sixth Sense (1999)
49. Prisoners (2013)              50. Knives Out (2019)

Animation
51. The Lion King (1994)          52. Toy Story (1995)
53. Finding Nemo (2003)           54. Up (2009)
55. WALL-E (2008)                 56. Shrek (2001)
57. Spirited Away (2001)          58. The Incredibles (2004)
59. Frozen (2013)                 60. Coco (2017)

Adventure & Fantasy
61. The Lord of the Rings: The Fellowship of the Ring (2001)
62. Harry Potter and the Sorcerer's Stone (2001)
63. Pirates of the Caribbean: The Curse of the Black Pearl (2003)
64. Raiders of the Lost Ark (1981)
65. The Princess Bride (1987)     66. Labyrinth (1986)
67. The Wizard of Oz (1939)       68. Pan's Labyrinth (2006)
69. The Chronicles of Narnia: The Lion, the Witch and the Wardrobe (2005)
70. Stardust (2007)

Horror
71. The Shining (1980)            72. Get Out (2017)
73. A Quiet Place (2018)          74. It (2017)
75. Hereditary (2018)             76. The Conjuring (2013)
77. Scream (1996)                 78. Halloween (1978)
79. A Nightmare on Elm Street (1984) 80. The Exorcist (1973)

Drama & Biopics
81. Bohemian Rhapsody (2018)      82. The Social Network (2010)
83. Whiplash (2014)               84. La La Land (2016)
85. Birdman (2014)                86. The Wolf of Wall Street (2013)
87. 12 Years a Slave (2013)       88. Dallas Buyers Club (2013)
89. The Imitation Game (2014)     90. Hidden Figures (2016)

Cult & Quirky
91. Eternal Sunshine of the Spotless Mind (2004)
92. Donnie Darko (2001)           93. The Grand Budapest Hotel (2014)
94. Fargo (1996)                  95. No Country for Old Men (2007)
96. There Will Be Blood (2007)    97. Her (2013)
98. Being John Malkovich (1999)   99. American Psycho (2000)
100. Parasite (2019)
```
