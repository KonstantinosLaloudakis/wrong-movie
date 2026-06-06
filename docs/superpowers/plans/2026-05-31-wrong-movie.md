# Double Take Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based movie quiz game where players guess films from clues that substitute actors' famous roles for actual character names, with a daily puzzle and an endless mode.

**Architecture:** Static React + Vite app deployed to GitHub Pages reads directly from a Supabase PostgreSQL database using the browser JS client. All game logic (guess matching, scoring, clue progression) runs client-side. A set of local Python scripts populates the database using the TMDb API and Anthropic Claude; these scripts are never deployed.

**Tech Stack:** React 18, Vite 5, TypeScript, Tailwind CSS 3, React Router 6, @supabase/supabase-js 2, Vitest, Python 3.11+, httpx, anthropic SDK, supabase-py, GitHub Actions, GitHub Pages.

---

## File Map

```
double-take/
├── .env.example                          # Frontend env var template
├── .gitignore
├── index.html                            # Vite entry point
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
│
├── .github/
│   └── workflows/
│       └── deploy.yml                    # Build + deploy to GitHub Pages
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql        # Full DB schema + RLS + RPC functions
│
├── scripts/                              # Python pipeline — local only, never deployed
│   ├── .env.example                      # Pipeline env var template
│   ├── requirements.txt
│   ├── config.py                         # Env vars + constants
│   ├── db.py                             # Supabase client factory
│   ├── tmdb.py                           # TMDb API wrapper
│   ├── seed_movies.py                    # TMDb → movies + actors + movie_cast
│   ├── seed_famous_roles.py              # TMDb person credits → famous_roles
│   ├── generate_clues.py                 # Anthropic API → clues
│   ├── schedule_daily.py                 # Pre-seed daily_puzzles table
│   └── tests/
│       ├── test_seed_movies.py           # normalize_title unit tests
│       └── test_generate_clues.py        # is_valid_clue unit tests
│
└── src/
    ├── index.css                         # Tailwind directives
    ├── main.tsx                          # React entry point
    ├── App.tsx                           # Router + layout shell
    │
    ├── types/
    │   └── index.ts                      # Shared TypeScript types
    │
    ├── lib/
    │   ├── supabase.ts                   # Supabase browser client singleton
    │   └── guessMatch.ts                 # normalizeTitle + isCorrectGuess (pure)
    │
    ├── hooks/
    │   ├── useLocalStorage.ts            # Generic localStorage state hook
    │   ├── useDailyPuzzle.ts             # Daily puzzle fetch + guess + streak logic
    │   └── useEndlessGame.ts             # Endless mode session logic
    │
    ├── components/
    │   ├── ClueDisplay.tsx               # Shows hard/medium/easy clues progressively
    │   ├── GuessInput.tsx                # Controlled text input + submit
    │   ├── ResultOverlay.tsx             # Correct/wrong result card + poster
    │   └── ShareButton.tsx               # Copies emoji result grid to clipboard
    │
    ├── pages/
    │   ├── DailyPage.tsx                 # Daily puzzle assembled from components
    │   └── EndlessPage.tsx               # Endless mode assembled from components
    │
    └── test/
        └── setup.ts                      # @testing-library/jest-dom import
```

---

## Task 1: Repository + project scaffold

**Files:**
- Create: `.gitignore`
- Create: `index.html`
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.env.example`
- Create: `src/index.css`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Initialise git repo and create project root**

```bash
cd C:\workspace\double-take
git init
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
.env
.env.local
scripts/.env
scripts/__pycache__/
scripts/.venv/
*.pyc
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "double-take",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.2.0",
    "@testing-library/react": "^14.1.0",
    "@types/react": "^18.2.46",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.10",
    "vitest": "^1.1.0"
  }
}
```

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Create `vite.config.ts`**

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/double-take/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 6: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 7: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "tailwind.config.ts"]
}
```

- [ ] **Step 8: Create `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 9: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 10: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Double Take</title>
    <meta name="description" content="Guess the movie from clues using famous roles." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 11: Create `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 12: Create `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 13: Create `.env.example`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 14: Verify Vite dev server starts**

```bash
# Create a temporary src/main.tsx so Vite has something to serve
echo 'export {}' > src/main.tsx
npm run dev
```

Expected: Vite prints a local URL like `http://localhost:5173/double-take/`. Stop with Ctrl+C.

- [ ] **Step 15: Commit**

```bash
git add .
git commit -m "chore: initialise React + Vite + Tailwind project"
```

---

## Task 2: Supabase schema migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create a Supabase project**

Go to [supabase.com](https://supabase.com), create a free project. Note your **Project URL** and **anon key** (Settings → API) and **service role key** (Settings → API → service_role).

- [ ] **Step 2: Create `supabase/migrations/001_initial_schema.sql`**

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum
CREATE TYPE clue_difficulty AS ENUM ('easy', 'medium', 'hard');

-- Tables
CREATE TABLE movies (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            text NOT NULL,
  normalized_title text NOT NULL,
  alt_titles       text[] NOT NULL DEFAULT '{}',
  release_year     int NOT NULL,
  tmdb_id          int UNIQUE NOT NULL,
  imdb_id          text,
  plot_summary     text,
  poster_url       text,
  genres           text[] NOT NULL DEFAULT '{}',
  is_active        bool NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE actors (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL,
  tmdb_id    int UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE famous_roles (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id           uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  role_name          text NOT NULL,
  source_movie_title text NOT NULL,
  source_movie_year  int NOT NULL DEFAULT 0,
  famousness_score   float NOT NULL DEFAULT 0.0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, source_movie_title)
);

CREATE TABLE movie_cast (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  movie_id       uuid NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  actor_id       uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  character_name text NOT NULL,
  cast_order     int NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (movie_id, actor_id)
);

CREATE TABLE clues (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  movie_id         uuid NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  clue_text        text NOT NULL,
  difficulty       clue_difficulty NOT NULL,
  quality_score    float NOT NULL DEFAULT 0.0,
  is_active        bool NOT NULL DEFAULT true,
  generation_model text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE daily_puzzles (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  puzzle_date    date UNIQUE NOT NULL,
  movie_id       uuid NOT NULL REFERENCES movies(id),
  clue_hard_id   uuid NOT NULL REFERENCES clues(id),
  clue_medium_id uuid NOT NULL REFERENCES clues(id),
  clue_easy_id   uuid NOT NULL REFERENCES clues(id),
  puzzle_number  int UNIQUE NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_movies_active      ON movies(is_active);
CREATE INDEX idx_clues_movie        ON clues(movie_id);
CREATE INDEX idx_clues_active       ON clues(is_active);
CREATE INDEX idx_cast_movie         ON movie_cast(movie_id);
CREATE INDEX idx_famous_roles_actor ON famous_roles(actor_id);
CREATE INDEX idx_daily_date         ON daily_puzzles(puzzle_date);

-- RLS
ALTER TABLE movies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE actors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE famous_roles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_cast    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_puzzles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read movies"        ON movies        FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon read actors"        ON actors        FOR SELECT TO anon USING (true);
CREATE POLICY "anon read famous_roles"  ON famous_roles  FOR SELECT TO anon USING (true);
CREATE POLICY "anon read movie_cast"    ON movie_cast    FOR SELECT TO anon USING (true);
CREATE POLICY "anon read clues"         ON clues         FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon read daily_puzzles" ON daily_puzzles FOR SELECT TO anon USING (true);

-- RPC: fetch today's daily puzzle
CREATE OR REPLACE FUNCTION get_daily_puzzle(p_date date)
RETURNS TABLE (
  puzzle_number  int,
  movie_id       uuid,
  title          text,
  normalized_title text,
  alt_titles     text[],
  poster_url     text,
  clue_hard_id   uuid,
  clue_medium_id uuid,
  clue_easy_id   uuid,
  hard_clue      text,
  medium_clue    text,
  easy_clue      text
) AS $$
  SELECT
    dp.puzzle_number,
    m.id,
    m.title,
    m.normalized_title,
    m.alt_titles,
    m.poster_url,
    dp.clue_hard_id,
    dp.clue_medium_id,
    dp.clue_easy_id,
    c_h.clue_text,
    c_m.clue_text,
    c_e.clue_text
  FROM daily_puzzles dp
  JOIN movies m  ON dp.movie_id      = m.id
  JOIN clues c_h ON dp.clue_hard_id   = c_h.id
  JOIN clues c_m ON dp.clue_medium_id = c_m.id
  JOIN clues c_e ON dp.clue_easy_id   = c_e.id
  WHERE dp.puzzle_date = p_date;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RPC: fetch a random movie for endless mode (excluding played IDs)
CREATE OR REPLACE FUNCTION get_random_movie(excluded_ids uuid[])
RETURNS TABLE (
  movie_id         uuid,
  title            text,
  normalized_title text,
  alt_titles       text[],
  poster_url       text,
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
  ORDER BY RANDOM()
  LIMIT 1;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_daily_puzzle(date)    TO anon;
GRANT EXECUTE ON FUNCTION get_random_movie(uuid[])  TO anon;
```

- [ ] **Step 3: Run the migration in Supabase**

In the Supabase dashboard: go to **SQL Editor**, paste the full contents of `001_initial_schema.sql`, and click **Run**.

Expected: All statements succeed with no errors.

- [ ] **Step 4: Verify tables exist**

In Supabase **Table Editor**, confirm these tables are visible: `movies`, `actors`, `famous_roles`, `movie_cast`, `clues`, `daily_puzzles`.

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema with RLS and RPC functions"
```

---

## Task 3: Python pipeline foundation

**Files:**
- Create: `scripts/requirements.txt`
- Create: `scripts/.env.example`
- Create: `scripts/config.py`
- Create: `scripts/db.py`

- [ ] **Step 1: Create Python virtual environment**

```bash
cd scripts
python -m venv .venv
.venv\Scripts\activate   # Windows PowerShell
```

- [ ] **Step 2: Create `scripts/requirements.txt`**

```
anthropic>=0.21.0
httpx>=0.26.0
supabase>=2.3.0
python-dotenv>=1.0.0
pytest>=7.4.0
```

- [ ] **Step 3: Install dependencies**

```bash
pip install -r requirements.txt
```

Expected: All packages install without errors.

- [ ] **Step 4: Create `scripts/.env.example`**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
TMDB_API_KEY=your-tmdb-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

- [ ] **Step 5: Copy `.env.example` to `.env` and fill in real values**

```bash
copy scripts\.env.example scripts\.env
```

Then edit `scripts/.env` and fill in your actual keys:
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from Supabase → Settings → API
- `TMDB_API_KEY` from [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) (free registration)
- `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com) (add $5 credits)

- [ ] **Step 6: Create `scripts/config.py`**

```python
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
TMDB_API_KEY = os.environ["TMDB_API_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
MAX_CAST_PER_MOVIE = 6
MIN_CLUE_CONFIDENCE = 0.65
```

- [ ] **Step 7: Create `scripts/db.py`**

```python
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY


def get_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
```

- [ ] **Step 8: Verify connection**

```bash
cd scripts
python -c "from db import get_client; c = get_client(); print('Connected:', bool(c))"
```

Expected: `Connected: True`

- [ ] **Step 9: Commit**

```bash
cd ..
git add scripts/requirements.txt scripts/.env.example scripts/config.py scripts/db.py
git commit -m "feat: add Python pipeline foundation"
```

---

## Task 4: TMDb API client

**Files:**
- Create: `scripts/tmdb.py`

- [ ] **Step 1: Create `scripts/tmdb.py`**

```python
import httpx
from config import TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE_URL


def _get(path: str, **params) -> dict:
    with httpx.Client(timeout=15) as client:
        resp = client.get(
            f"{TMDB_BASE_URL}{path}",
            params={"api_key": TMDB_API_KEY, **params},
        )
        resp.raise_for_status()
        return resp.json()


def get_popular_movies(page: int = 1) -> list[dict]:
    return _get("/movie/popular", page=page)["results"]


def get_top_rated_movies(page: int = 1) -> list[dict]:
    return _get("/movie/top_rated", page=page)["results"]


def get_movie_details(tmdb_id: int) -> dict:
    return _get(f"/movie/{tmdb_id}")


def get_movie_credits(tmdb_id: int) -> dict:
    return _get(f"/movie/{tmdb_id}/credits")


def get_person_movie_credits(tmdb_id: int) -> dict:
    return _get(f"/person/{tmdb_id}/movie_credits")


def poster_url(poster_path: str | None) -> str | None:
    if not poster_path:
        return None
    return f"{TMDB_IMAGE_BASE_URL}{poster_path}"
```

- [ ] **Step 2: Smoke-test the client**

```bash
cd scripts
python -c "from tmdb import get_popular_movies; movies = get_popular_movies(); print(movies[0]['title'])"
```

Expected: Prints the title of a popular movie (e.g. `Inception`).

- [ ] **Step 3: Commit**

```bash
cd ..
git add scripts/tmdb.py
git commit -m "feat: add TMDb API client"
```

---

## Task 5: seed_movies.py + normalize_title tests

**Files:**
- Create: `scripts/seed_movies.py`
- Create: `scripts/tests/test_seed_movies.py`

- [ ] **Step 1: Write the failing tests first**

Create `scripts/tests/__init__.py` (empty file), then create `scripts/tests/test_seed_movies.py`:

```python
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from seed_movies import normalize_title


def test_strips_leading_the():
    assert normalize_title("The Matrix") == "matrix"


def test_strips_leading_a():
    assert normalize_title("A Beautiful Mind") == "beautiful mind"


def test_strips_leading_an():
    assert normalize_title("An American Werewolf in London") == "american werewolf in london"


def test_lowercases():
    assert normalize_title("FORREST GUMP") == "forrest gump"


def test_strips_punctuation():
    assert normalize_title("Schindler's List") == "schindlers list"


def test_collapses_whitespace():
    assert normalize_title("  Blade   Runner  ") == "blade runner"


def test_does_not_strip_the_mid_title():
    assert normalize_title("From the Earth to the Moon") == "from the earth to the moon"


def test_handles_numbers():
    assert normalize_title("Se7en") == "se7en"
```

- [ ] **Step 2: Run tests — expect ImportError (file doesn't exist yet)**

```bash
cd scripts
python -m pytest tests/test_seed_movies.py -v
```

Expected: `ModuleNotFoundError: No module named 'seed_movies'`

- [ ] **Step 3: Create `scripts/seed_movies.py`**

```python
import re
import time
from db import get_client
from tmdb import (
    get_popular_movies,
    get_top_rated_movies,
    get_movie_details,
    get_movie_credits,
    poster_url,
)
from config import MAX_CAST_PER_MOVIE


def normalize_title(title: str) -> str:
    t = title.lower().strip()
    t = re.sub(r"^(the|a|an)\s+", "", t)
    t = re.sub(r"[^\w\s]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def seed_movie(supabase, tmdb_movie: dict) -> str | None:
    """Insert or skip a movie. Returns the movie UUID."""
    tmdb_id = tmdb_movie["id"]

    existing = supabase.table("movies").select("id").eq("tmdb_id", tmdb_id).execute()
    if existing.data:
        print(f"  Skipping (already seeded): {tmdb_movie.get('title')}")
        return existing.data[0]["id"]

    details = get_movie_details(tmdb_id)
    credits = get_movie_credits(tmdb_id)

    release_date = details.get("release_date") or ""
    release_year = int(release_date[:4]) if len(release_date) >= 4 else 0

    movie_data = {
        "title": details["title"],
        "normalized_title": normalize_title(details["title"]),
        "alt_titles": [],
        "release_year": release_year,
        "tmdb_id": tmdb_id,
        "imdb_id": details.get("imdb_id"),
        "plot_summary": details.get("overview"),
        "poster_url": poster_url(details.get("poster_path")),
        "genres": [g["name"] for g in details.get("genres", [])],
        "is_active": True,
    }

    movie_result = supabase.table("movies").insert(movie_data).execute()
    movie_uuid = movie_result.data[0]["id"]

    cast = sorted(credits.get("cast", []), key=lambda x: x.get("order", 999))
    cast = cast[:MAX_CAST_PER_MOVIE]

    for member in cast:
        actor_result = (
            supabase.table("actors")
            .upsert(
                {"name": member["name"], "tmdb_id": member["id"]},
                on_conflict="tmdb_id",
            )
            .execute()
        )
        actor_uuid = actor_result.data[0]["id"]

        supabase.table("movie_cast").upsert(
            {
                "movie_id": movie_uuid,
                "actor_id": actor_uuid,
                "character_name": member.get("character", ""),
                "cast_order": member.get("order", 0),
            },
            on_conflict="movie_id,actor_id",
        ).execute()

    print(f"  Seeded: {details['title']} ({release_year})")
    return movie_uuid


def seed_movies(target: int = 100):
    supabase = get_client()
    seeded = 0
    page = 1

    while seeded < target:
        movies = get_popular_movies(page) + get_top_rated_movies(page)
        for m in movies:
            if seeded >= target:
                break
            try:
                seed_movie(supabase, m)
                seeded += 1
                time.sleep(0.1)  # be polite to TMDb rate limits
            except Exception as e:
                print(f"  Error seeding {m.get('title')}: {e}")
        page += 1


if __name__ == "__main__":
    import sys
    target = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    print(f"Seeding {target} movies...")
    seed_movies(target)
    print("Done.")
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd scripts
python -m pytest tests/test_seed_movies.py -v
```

Expected:
```
PASSED tests/test_seed_movies.py::test_strips_leading_the
PASSED tests/test_seed_movies.py::test_strips_leading_a
... (8 passed)
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add scripts/seed_movies.py scripts/tests/
git commit -m "feat: add seed_movies script with normalize_title"
```

---

## Task 6: seed_famous_roles.py

**Files:**
- Create: `scripts/seed_famous_roles.py`

This script reads actors already in the database, fetches their filmography from TMDb, and seeds their most famous roles. It uses `tmdb_popularity` of each credit as a proxy for how recognisable the role is.

- [ ] **Step 1: Create `scripts/seed_famous_roles.py`**

```python
import time
from db import get_client
from tmdb import get_person_movie_credits


def famousness_score(credit: dict) -> float:
    """Score a credit by movie popularity, capped to 0–1 range."""
    return min(credit.get("popularity", 0) / 100.0, 1.0)


def seed_actor_roles(supabase, actor: dict) -> int:
    """Seed famous_roles for one actor. Returns number of roles inserted."""
    credits_data = get_person_movie_credits(actor["tmdb_id"])
    cast_credits = credits_data.get("cast", [])

    # Keep only credits with a real character name and reasonable popularity
    valid = [
        c for c in cast_credits
        if c.get("character")
        and c.get("popularity", 0) > 3
        and c.get("release_date")
    ]

    # Sort by popularity descending, take top 4
    valid.sort(key=lambda x: x.get("popularity", 0), reverse=True)
    top = valid[:4]

    inserted = 0
    for credit in top:
        release_date = credit.get("release_date") or ""
        year = int(release_date[:4]) if len(release_date) >= 4 else 0

        supabase.table("famous_roles").upsert(
            {
                "actor_id": actor["id"],
                "role_name": credit["character"],
                "source_movie_title": credit["title"],
                "source_movie_year": year,
                "famousness_score": famousness_score(credit),
            },
            on_conflict="actor_id,source_movie_title",
        ).execute()
        inserted += 1

    return inserted


def seed_famous_roles():
    supabase = get_client()
    actors = supabase.table("actors").select("id,name,tmdb_id").execute().data
    print(f"Seeding famous roles for {len(actors)} actors...")

    for actor in actors:
        try:
            n = seed_actor_roles(supabase, actor)
            print(f"  {actor['name']}: {n} roles")
            time.sleep(0.1)
        except Exception as e:
            print(f"  Error for {actor['name']}: {e}")

    print("Done.")


if __name__ == "__main__":
    seed_famous_roles()
```

- [ ] **Step 2: Run the script (after seed_movies has run at least once)**

First, verify some actors exist:

```bash
cd scripts
python -c "from db import get_client; c = get_client(); print(len(c.table('actors').select('id').execute().data), 'actors')"
```

Expected: a number > 0 (e.g. `47 actors`).

If 0, run `python seed_movies.py 10` first to seed some test data.

Then run:

```bash
python seed_famous_roles.py
```

Expected: Lines like `  Tom Hanks: 4 roles`, no errors.

- [ ] **Step 3: Commit**

```bash
cd ..
git add scripts/seed_famous_roles.py
git commit -m "feat: add seed_famous_roles script"
```

---

## Task 7: generate_clues.py + validity tests

**Files:**
- Create: `scripts/generate_clues.py`
- Create: `scripts/tests/test_generate_clues.py`

- [ ] **Step 1: Write the failing tests first**

Create `scripts/tests/test_generate_clues.py`:

```python
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from generate_clues import is_valid_clue, build_cast_lines


def test_rejects_low_confidence():
    assert not is_valid_clue("A perfectly good clue here.", 0.5, "Movie Title", [])


def test_rejects_when_title_in_clue():
    assert not is_valid_clue(
        "This is about The Matrix somehow.",
        0.9,
        "The Matrix",
        [],
    )


def test_title_check_is_case_insensitive():
    assert not is_valid_clue(
        "the matrix is mentioned here.",
        0.9,
        "The Matrix",
        [],
    )


def test_rejects_when_character_name_in_clue():
    assert not is_valid_clue(
        "Neo fights Agent Smith in a simulation.",
        0.9,
        "The Matrix",
        ["Neo", "Trinity"],
    )


def test_rejects_too_short():
    assert not is_valid_clue("Short.", 0.9, "Movie", [])


def test_accepts_valid_clue():
    assert is_valid_clue(
        "A leather-clad hero from an epic ring-quest learns reality is a simulation.",
        0.85,
        "The Matrix",
        ["Neo", "Trinity", "Morpheus"],
    )


def test_build_cast_lines_formats_correctly():
    cast = [
        {
            "character_name": "Joel",
            "actor_name": "Jim Carrey",
            "role_name": "The Riddler",
            "source_movie_title": "Batman Forever",
        }
    ]
    result = build_cast_lines(cast)
    assert "Joel" in result
    assert "Jim Carrey" in result
    assert "The Riddler" in result
    assert "Batman Forever" in result
```

- [ ] **Step 2: Run tests — expect ImportError**

```bash
cd scripts
python -m pytest tests/test_generate_clues.py -v
```

Expected: `ModuleNotFoundError: No module named 'generate_clues'`

- [ ] **Step 3: Create `scripts/generate_clues.py`**

```python
import json
import time
import anthropic
from db import get_client
from config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL, MIN_CLUE_CONFIDENCE

_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

PROMPT_TEMPLATE = """You are writing clues for a movie trivia game called "Double Take".

Rules:
- Describe the movie's plot using actors' FAMOUS ROLES from OTHER movies instead of actual character names
- Never mention the movie's actual title
- Never use the movie's actual character names
- Each clue must be 1-3 sentences
- A player who knows the actors should be able to figure out the real movie

Generate exactly 3 clues at different difficulty levels:

HARD: Describe the plot abstractly. Do NOT use the famous role names at all.
Use conceptual descriptions only (e.g. "a caped crusader's nemesis", "a fellowship's reluctant hero").

MEDIUM: Use indirect references to the famous roles
(e.g. "a Gotham villain", "a hobbit-like figure").

EASY: Directly substitute famous role names for the actual characters
(e.g. "The Riddler hires Frodo to erase his ex from his memory").

Movie: {title} ({year})
Plot: {plot}

Cast:
{cast_lines}

Respond ONLY with valid JSON, no other text:
{{
  "hard":   {{ "clue": "...", "confidence": 0.0 }},
  "medium": {{ "clue": "...", "confidence": 0.0 }},
  "easy":   {{ "clue": "...", "confidence": 0.0 }}
}}

confidence = how likely a movie-literate player can solve this clue (1.0 = very guessable)."""


def build_cast_lines(cast_with_roles: list[dict]) -> str:
    lines = [
        f"- {c['character_name']} is played by {c['actor_name']}, "
        f"famous for playing {c['role_name']} in {c['source_movie_title']}"
        for c in cast_with_roles
    ]
    return "\n".join(lines)


def is_valid_clue(
    clue_text: str,
    confidence: float,
    movie_title: str,
    character_names: list[str],
) -> bool:
    if confidence < MIN_CLUE_CONFIDENCE:
        return False
    if len(clue_text.strip()) < 20:
        return False
    if movie_title.lower() in clue_text.lower():
        return False
    for name in character_names:
        if name and name.lower() in clue_text.lower():
            return False
    return True


def _call_llm(prompt: str) -> dict | None:
    try:
        response = _client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=700,
            messages=[{"role": "user", "content": prompt}],
        )
        return json.loads(response.content[0].text)
    except (json.JSONDecodeError, anthropic.APIError):
        return None


def generate_clues_for_movie(movie: dict, cast_with_roles: list[dict]) -> dict | None:
    if not cast_with_roles:
        return None

    prompt = PROMPT_TEMPLATE.format(
        title=movie["title"],
        year=movie["release_year"],
        plot=movie.get("plot_summary") or "No plot available.",
        cast_lines=build_cast_lines(cast_with_roles),
    )

    result = _call_llm(prompt)
    if result is None:
        time.sleep(2)
        result = _call_llm(prompt)  # one retry
    return result


def _get_cast_with_roles(supabase, movie_id: str, active_movie_tmdb_ids: set[int]) -> list[dict]:
    """Return cast members that have a famous role not in our own movie pool."""
    cast_rows = (
        supabase.table("movie_cast")
        .select("character_name, actors(id, name, tmdb_id)")
        .eq("movie_id", movie_id)
        .order("cast_order")
        .execute()
        .data
    )

    result = []
    for row in cast_rows:
        actor = row["actors"]
        # Get the actor's best famous role that is NOT from a movie in our pool
        roles = (
            supabase.table("famous_roles")
            .select("role_name, source_movie_title, source_movie_year, famousness_score")
            .eq("actor_id", actor["id"])
            .order("famousness_score", desc=True)
            .execute()
            .data
        )
        # Pick first role whose source movie is not in our pool
        best_role = next(
            (r for r in roles if r["source_movie_title"].lower() not in
             {t.lower() for t in active_movie_tmdb_ids}),
            roles[0] if roles else None,
        )
        if best_role:
            result.append({
                "character_name": row["character_name"],
                "actor_name": actor["name"],
                "role_name": best_role["role_name"],
                "source_movie_title": best_role["source_movie_title"],
            })
    return result


def save_clues(supabase, movie: dict, clues_json: dict, character_names: list[str]):
    for difficulty in ("hard", "medium", "easy"):
        entry = clues_json.get(difficulty, {})
        clue_text = entry.get("clue", "")
        confidence = float(entry.get("confidence", 0.0))
        active = is_valid_clue(clue_text, confidence, movie["title"], character_names)

        supabase.table("clues").insert({
            "movie_id": movie["id"],
            "clue_text": clue_text,
            "difficulty": difficulty,
            "quality_score": confidence,
            "is_active": active,
            "generation_model": ANTHROPIC_MODEL,
        }).execute()


def generate_all_clues():
    supabase = get_client()

    movies = (
        supabase.table("movies")
        .select("id, title, release_year, plot_summary, tmdb_id")
        .eq("is_active", True)
        .execute()
        .data
    )

    # Build set of all movie titles in our pool to detect famous-role conflicts
    active_titles = {m["title"] for m in movies}

    for movie in movies:
        # Skip if already has active clues for all 3 difficulties
        existing = (
            supabase.table("clues")
            .select("difficulty")
            .eq("movie_id", movie["id"])
            .eq("is_active", True)
            .execute()
            .data
        )
        existing_diffs = {r["difficulty"] for r in existing}
        if {"hard", "medium", "easy"} == existing_diffs:
            print(f"  Skipping (already has clues): {movie['title']}")
            continue

        cast_with_roles = _get_cast_with_roles(supabase, movie["id"], active_titles)
        clues_json = generate_clues_for_movie(movie, cast_with_roles)

        if clues_json is None:
            print(f"  Failed to generate clues for: {movie['title']}")
            continue

        character_names = [c["character_name"] for c in cast_with_roles]
        save_clues(supabase, movie, clues_json, character_names)
        print(f"  Generated clues for: {movie['title']}")
        time.sleep(0.5)  # avoid rate limiting

    print("Done.")


if __name__ == "__main__":
    generate_all_clues()
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
cd scripts
python -m pytest tests/test_generate_clues.py -v
```

Expected:
```
PASSED tests/test_generate_clues.py::test_rejects_low_confidence
PASSED tests/test_generate_clues.py::test_rejects_when_title_in_clue
... (7 passed)
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add scripts/generate_clues.py scripts/tests/test_generate_clues.py
git commit -m "feat: add clue generation pipeline with quality validation"
```

---

## Task 8: schedule_daily.py

**Files:**
- Create: `scripts/schedule_daily.py`

- [ ] **Step 1: Create `scripts/schedule_daily.py`**

```python
import random
from datetime import date, timedelta
from db import get_client


def schedule_daily_puzzles(days_ahead: int = 60):
    supabase = get_client()

    # Find where to continue from
    latest = (
        supabase.table("daily_puzzles")
        .select("puzzle_date, puzzle_number")
        .order("puzzle_date", desc=True)
        .limit(1)
        .execute()
        .data
    )

    if latest:
        start_date = date.fromisoformat(latest[0]["puzzle_date"]) + timedelta(days=1)
        next_number = latest[0]["puzzle_number"] + 1
    else:
        start_date = date.today()
        next_number = 1

    # Already-scheduled movie IDs
    scheduled_ids = {
        row["movie_id"]
        for row in supabase.table("daily_puzzles").select("movie_id").execute().data
    }

    # Find movies with all 3 active clue difficulties
    all_movies = (
        supabase.table("movies").select("id").eq("is_active", True).execute().data
    )
    available = []
    for m in all_movies:
        if m["id"] in scheduled_ids:
            continue
        diffs = {
            row["difficulty"]
            for row in supabase.table("clues")
            .select("difficulty")
            .eq("movie_id", m["id"])
            .eq("is_active", True)
            .execute()
            .data
        }
        if {"hard", "medium", "easy"} <= diffs:
            available.append(m["id"])

    random.shuffle(available)
    to_schedule = min(days_ahead, len(available))
    print(f"Scheduling {to_schedule} puzzles starting {start_date}...")

    for i in range(to_schedule):
        movie_id = available[i]
        puzzle_date = start_date + timedelta(days=i)

        clue_ids = {}
        for diff in ("hard", "medium", "easy"):
            clue = (
                supabase.table("clues")
                .select("id")
                .eq("movie_id", movie_id)
                .eq("difficulty", diff)
                .eq("is_active", True)
                .order("quality_score", desc=True)
                .limit(1)
                .execute()
                .data
            )
            clue_ids[diff] = clue[0]["id"]

        supabase.table("daily_puzzles").insert({
            "puzzle_date": puzzle_date.isoformat(),
            "movie_id": movie_id,
            "clue_hard_id": clue_ids["hard"],
            "clue_medium_id": clue_ids["medium"],
            "clue_easy_id": clue_ids["easy"],
            "puzzle_number": next_number + i,
        }).execute()

        print(f"  #{next_number + i} → {puzzle_date}")

    print("Done.")


if __name__ == "__main__":
    import sys
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    schedule_daily_puzzles(days)
```

- [ ] **Step 2: Commit**

```bash
git add scripts/schedule_daily.py
git commit -m "feat: add daily puzzle scheduler"
```

---

## Task 9: Run the full pipeline end-to-end

This task runs all pipeline scripts in order to populate Supabase with real data.

- [ ] **Step 1: Seed 100 movies**

```bash
cd scripts
python seed_movies.py 100
```

Expected: 100 lines like `  Seeded: Inception (2010)`. Takes ~3 minutes (TMDb rate limiting).

- [ ] **Step 2: Seed famous roles**

```bash
python seed_famous_roles.py
```

Expected: Lines like `  Tom Hanks: 4 roles`. Takes ~2 minutes.

- [ ] **Step 3: Generate clues**

```bash
python generate_clues.py
```

Expected: Lines like `  Generated clues for: Inception`. Takes ~5 minutes and costs ~$0.15. Verify in Supabase Table Editor that `clues` table has rows.

- [ ] **Step 4: Schedule daily puzzles**

```bash
python schedule_daily.py 60
```

Expected: 60 lines like `  #1 → 2026-05-31`. Verify in Supabase that `daily_puzzles` has 60 rows.

- [ ] **Step 5: Verify today's puzzle exists**

```bash
python -c "
from db import get_client
from datetime import date
c = get_client()
result = c.rpc('get_daily_puzzle', {'p_date': str(date.today())}).execute()
print(result.data[0]['title'] if result.data else 'NO PUZZLE TODAY')
"
```

Expected: prints a movie title.

---

## Task 10: TypeScript types + Supabase client

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Create `src/types/index.ts`**

```typescript
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Clue {
  id: string;
  text: string;
  difficulty: Difficulty;
}

export interface Puzzle {
  puzzleNumber: number;
  movieId: string;
  title: string;
  normalizedTitle: string;
  altTitles: string[];
  posterUrl: string | null;
  clues: {
    hard: Clue;
    medium: Clue;
    easy: Clue;
  };
}

export type GuessResult = 'correct' | 'wrong' | 'unanswered';

export interface RoundState {
  revealedDifficulty: Difficulty;
  guesses: string[];
  result: GuessResult;
}

export interface DailyResult {
  date: string;
  puzzleNumber: number;
  result: GuessResult;
  guessCount: number;
  pointsEarned: number;
}

export interface StreakData {
  current: number;
  best: number;
  lastPlayedDate: string | null;
}
```

- [ ] **Step 2: Create `.env.local` with your Supabase credentials**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

(Do NOT commit `.env.local` — it's already in `.gitignore`.)

- [ ] **Step 3: Create `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 4: Commit**

```bash
git add src/types/ src/lib/supabase.ts
git commit -m "feat: add TypeScript types and Supabase browser client"
```

---

## Task 11: guessMatch utility + tests

**Files:**
- Create: `src/lib/guessMatch.ts`
- Create: `src/lib/guessMatch.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/guessMatch.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeTitle, isCorrectGuess } from './guessMatch';

describe('normalizeTitle', () => {
  it('strips leading "The"', () => {
    expect(normalizeTitle('The Matrix')).toBe('matrix');
  });
  it('strips leading "A"', () => {
    expect(normalizeTitle('A Beautiful Mind')).toBe('beautiful mind');
  });
  it('strips leading "An"', () => {
    expect(normalizeTitle('An American in Paris')).toBe('american in paris');
  });
  it('lowercases', () => {
    expect(normalizeTitle('FORREST GUMP')).toBe('forrest gump');
  });
  it('strips punctuation', () => {
    expect(normalizeTitle("Schindler's List")).toBe('schindlers list');
  });
  it('trims and collapses whitespace', () => {
    expect(normalizeTitle('  Blade   Runner  ')).toBe('blade runner');
  });
  it('does not strip "the" mid-title', () => {
    expect(normalizeTitle('From the Earth to the Moon')).toBe(
      'from the earth to the moon'
    );
  });
});

describe('isCorrectGuess', () => {
  it('matches exact title', () => {
    expect(isCorrectGuess('Inception', 'inception', [])).toBe(true);
  });
  it('matches without leading article', () => {
    expect(isCorrectGuess('Matrix', 'matrix', [])).toBe(true);
  });
  it('matches with one-character typo', () => {
    expect(isCorrectGuess('Incepton', 'inception', [])).toBe(true);
  });
  it('matches with two-character typo', () => {
    expect(isCorrectGuess('Forrest Gunp', 'forrest gump', [])).toBe(true);
  });
  it('rejects wrong title', () => {
    expect(isCorrectGuess('The Godfather', 'inception', [])).toBe(false);
  });
  it('rejects empty guess', () => {
    expect(isCorrectGuess('', 'inception', [])).toBe(false);
  });
  it('matches an alt title', () => {
    expect(
      isCorrectGuess('Dark Knight', 'the dark knight rises', ['dark knight'])
    ).toBe(true);
  });
  it('rejects typo that exceeds distance 2', () => {
    expect(isCorrectGuess('Completely Wrong Title', 'inception', [])).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test
```

Expected: `Cannot find module './guessMatch'`

- [ ] **Step 3: Create `src/lib/guessMatch.ts`**

```typescript
const LEADING_ARTICLE = /^(the|a|an)\s+/i;
const NON_WORD_CHARS = /[^\w\s]/g;
const EXTRA_WHITESPACE = /\s+/g;

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(LEADING_ARTICLE, '')
    .replace(NON_WORD_CHARS, '')
    .replace(EXTRA_WHITESPACE, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

export function isCorrectGuess(
  guess: string,
  normalizedTitle: string,
  altTitles: string[]
): boolean {
  const normalizedGuess = normalizeTitle(guess);
  if (!normalizedGuess) return false;

  const targets = [normalizedTitle, ...altTitles.map(normalizeTitle)];
  return targets.some(
    (target) =>
      normalizedGuess === target || levenshtein(normalizedGuess, target) <= 2
  );
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test
```

Expected:
```
✓ src/lib/guessMatch.test.ts (15)
  ✓ normalizeTitle (7)
  ✓ isCorrectGuess (8)
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/guessMatch.ts src/lib/guessMatch.test.ts
git commit -m "feat: add guess matching with fuzzy title normalization"
```

---

## Task 12: useLocalStorage hook

**Files:**
- Create: `src/hooks/useLocalStorage.ts`

- [ ] **Step 1: Create `src/hooks/useLocalStorage.ts`**

```typescript
import { useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    const valueToStore =
      value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    window.localStorage.setItem(key, JSON.stringify(valueToStore));
  };

  return [storedValue, setValue] as const;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useLocalStorage.ts
git commit -m "feat: add useLocalStorage hook"
```

---

## Task 13: useDailyPuzzle hook

**Files:**
- Create: `src/hooks/useDailyPuzzle.ts`

- [ ] **Step 1: Create `src/hooks/useDailyPuzzle.ts`**

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isCorrectGuess } from '../lib/guessMatch';
import { useLocalStorage } from './useLocalStorage';
import type {
  Puzzle,
  RoundState,
  DailyResult,
  StreakData,
  Difficulty,
} from '../types';

const DIFFICULTY_ORDER: Difficulty[] = ['hard', 'medium', 'easy'];
const POINTS_MAP: Record<Difficulty, number> = { hard: 3, medium: 2, easy: 1 };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useDailyPuzzle() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<RoundState>({
    revealedDifficulty: 'hard',
    guesses: [],
    result: 'unanswered',
  });

  const [savedResult, setSavedResult] = useLocalStorage<DailyResult | null>(
    `daily-result-${todayStr()}`,
    null
  );
  const [streak, setStreak] = useLocalStorage<StreakData>('streak', {
    current: 0,
    best: 0,
    lastPlayedDate: null,
  });

  useEffect(() => {
    fetchDailyPuzzle();
  }, []);

  async function fetchDailyPuzzle() {
    setLoading(true);
    const { data, error: err } = await supabase.rpc('get_daily_puzzle', {
      p_date: todayStr(),
    });

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

    // Restore state if already played today
    if (savedResult) {
      const diffIndex = savedResult.guessCount - 1;
      setState({
        revealedDifficulty: DIFFICULTY_ORDER[Math.min(diffIndex, 2)],
        guesses: [],
        result: savedResult.result,
      });
    }

    setLoading(false);
  }

  function submitGuess(guess: string) {
    if (!puzzle || state.result !== 'unanswered') return;

    const correct = isCorrectGuess(
      guess,
      puzzle.normalizedTitle,
      puzzle.altTitles
    );
    const newGuesses = [...state.guesses, guess];
    const currentIndex = DIFFICULTY_ORDER.indexOf(state.revealedDifficulty);

    if (correct) {
      const points = POINTS_MAP[state.revealedDifficulty];
      setSavedResult({
        date: todayStr(),
        puzzleNumber: puzzle.puzzleNumber,
        result: 'correct',
        guessCount: newGuesses.length,
        pointsEarned: points,
      });
      updateStreak(true);
      setState({ ...state, guesses: newGuesses, result: 'correct' });
    } else if (currentIndex < DIFFICULTY_ORDER.length - 1) {
      setState({
        guesses: newGuesses,
        revealedDifficulty: DIFFICULTY_ORDER[currentIndex + 1],
        result: 'unanswered',
      });
    } else {
      setSavedResult({
        date: todayStr(),
        puzzleNumber: puzzle.puzzleNumber,
        result: 'wrong',
        guessCount: newGuesses.length,
        pointsEarned: 0,
      });
      updateStreak(false);
      setState({ ...state, guesses: newGuesses, result: 'wrong' });
    }
  }

  function updateStreak(won: boolean) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    setStreak((prev) => {
      const consecutive =
        won && prev.lastPlayedDate === yesterdayStr
          ? prev.current + 1
          : won
          ? 1
          : 0;
      return {
        current: consecutive,
        best: Math.max(prev.best, consecutive),
        lastPlayedDate: todayStr(),
      };
    });
  }

  return { puzzle, loading, error, state, savedResult, streak, submitGuess };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useDailyPuzzle.ts
git commit -m "feat: add useDailyPuzzle hook"
```

---

## Task 14: useEndlessGame hook

**Files:**
- Create: `src/hooks/useEndlessGame.ts`

- [ ] **Step 1: Create `src/hooks/useEndlessGame.ts`**

```typescript
import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isCorrectGuess } from '../lib/guessMatch';
import type { Puzzle, RoundState, Difficulty } from '../types';

const DIFFICULTY_ORDER: Difficulty[] = ['hard', 'medium', 'easy'];
const POINTS_MAP: Record<Difficulty, number> = { hard: 3, medium: 2, easy: 1 };

export function useEndlessGame() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [playedIds, setPlayedIds] = useState<string[]>([]);
  const [state, setState] = useState<RoundState>({
    revealedDifficulty: 'hard',
    guesses: [],
    result: 'unanswered',
  });

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setState({ revealedDifficulty: 'hard', guesses: [], result: 'unanswered' });

    const { data, error } = await supabase.rpc('get_random_movie', {
      excluded_ids: playedIds,
    });

    if (error || !data?.length) {
      setPuzzle(null);
      setLoading(false);
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
      clues: {
        hard: { id: '', text: row.hard_clue, difficulty: 'hard' },
        medium: { id: '', text: row.medium_clue, difficulty: 'medium' },
        easy: { id: '', text: row.easy_clue, difficulty: 'easy' },
      },
    });
    setPlayedIds((prev) => [...prev, row.movie_id]);
    setLoading(false);
  }, [playedIds]);

  function submitGuess(guess: string) {
    if (!puzzle || state.result !== 'unanswered') return;

    const correct = isCorrectGuess(
      guess,
      puzzle.normalizedTitle,
      puzzle.altTitles
    );
    const newGuesses = [...state.guesses, guess];
    const currentIndex = DIFFICULTY_ORDER.indexOf(state.revealedDifficulty);

    if (correct) {
      setSessionScore((s) => s + POINTS_MAP[state.revealedDifficulty]);
      setState({ ...state, guesses: newGuesses, result: 'correct' });
    } else if (currentIndex < DIFFICULTY_ORDER.length - 1) {
      setState({
        guesses: newGuesses,
        revealedDifficulty: DIFFICULTY_ORDER[currentIndex + 1],
        result: 'unanswered',
      });
    } else {
      setState({ ...state, guesses: newGuesses, result: 'wrong' });
    }
  }

  return { puzzle, loading, sessionScore, state, fetchNext, submitGuess };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useEndlessGame.ts
git commit -m "feat: add useEndlessGame hook"
```

---

## Task 15: ClueDisplay + GuessInput components

**Files:**
- Create: `src/components/ClueDisplay.tsx`
- Create: `src/components/GuessInput.tsx`

- [ ] **Step 1: Create `src/components/ClueDisplay.tsx`**

```typescript
import type { Difficulty, Clue } from '../types';

const LABELS: Record<Difficulty, string> = {
  hard: '🔴 Hard',
  medium: '🟡 Medium',
  easy: '🟢 Easy',
};

const ORDER: Difficulty[] = ['hard', 'medium', 'easy'];

interface Props {
  clues: { hard: Clue; medium: Clue; easy: Clue };
  revealedDifficulty: Difficulty;
}

export function ClueDisplay({ clues, revealedDifficulty }: Props) {
  const revealedIndex = ORDER.indexOf(revealedDifficulty);

  return (
    <div className="space-y-3">
      {ORDER.map((diff, i) => {
        const shown = i <= revealedIndex;
        return (
          <div
            key={diff}
            className={`rounded-lg border p-4 transition-all ${
              shown
                ? 'border-gray-200 bg-white shadow-sm'
                : 'border-dashed border-gray-200 bg-gray-50 opacity-40'
            }`}
          >
            <div className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
              {LABELS[diff]}
            </div>
            {shown ? (
              <p className="text-gray-800 leading-relaxed">{clues[diff].text}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Reveal by guessing incorrectly
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/GuessInput.tsx`**

```typescript
import { useState } from 'react';

interface Props {
  onSubmit: (guess: string) => void;
  disabled?: boolean;
}

export function GuessInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder="Type the movie title…"
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Guess
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ClueDisplay.tsx src/components/GuessInput.tsx
git commit -m "feat: add ClueDisplay and GuessInput components"
```

---

## Task 16: ResultOverlay + ShareButton components

**Files:**
- Create: `src/components/ResultOverlay.tsx`
- Create: `src/components/ShareButton.tsx`

- [ ] **Step 1: Create `src/components/ResultOverlay.tsx`**

```typescript
import type { Difficulty, GuessResult } from '../types';

const POINTS_MAP: Record<Difficulty, number> = { hard: 3, medium: 2, easy: 1 };

interface Props {
  result: GuessResult;
  movieTitle: string;
  posterUrl: string | null;
  difficulty: Difficulty;
  onNext?: () => void;
  isEndless?: boolean;
}

export function ResultOverlay({
  result,
  movieTitle,
  posterUrl,
  difficulty,
  onNext,
  isEndless,
}: Props) {
  if (result === 'unanswered') return null;

  const points = result === 'correct' ? POINTS_MAP[difficulty] : 0;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
      {result === 'correct' ? (
        <p className="text-lg font-bold text-green-600">Correct! +{points} pts</p>
      ) : (
        <p className="text-lg font-bold text-red-500">Not quite — the answer was:</p>
      )}
      <p className="mt-1 text-xl font-semibold text-gray-900">{movieTitle}</p>
      {posterUrl && (
        <img
          src={posterUrl}
          alt={movieTitle}
          className="mx-auto mt-3 h-44 w-auto rounded object-cover shadow"
        />
      )}
      {isEndless && onNext && (
        <button
          onClick={onNext}
          className="mt-4 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Next Movie →
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/ShareButton.tsx`**

```typescript
import { useState } from 'react';
import type { Difficulty, GuessResult } from '../types';

const CLUE_TRAIL: Record<Difficulty, string> = {
  hard: '🟢⬜⬜',
  medium: '🔴🟢⬜',
  easy: '🔴🔴🟢',
};

function buildShareText(
  puzzleNumber: number,
  result: GuessResult,
  difficulty: Difficulty
): string {
  const dots = result === 'correct' ? CLUE_TRAIL[difficulty] : '🔴🔴🔴';
  return `Double Take 🎬 #${puzzleNumber}\n${dots}\ndoubletake.github.io`;
}

interface Props {
  puzzleNumber: number;
  result: GuessResult;
  revealedDifficulty: Difficulty;
}

export function ShareButton({ puzzleNumber, result, revealedDifficulty }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const text = buildShareText(puzzleNumber, result, revealedDifficulty);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
    >
      {copied ? '✓ Copied to clipboard!' : '📋 Share result'}
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ResultOverlay.tsx src/components/ShareButton.tsx
git commit -m "feat: add ResultOverlay and ShareButton components"
```

---

## Task 17: DailyPage

**Files:**
- Create: `src/pages/DailyPage.tsx`

- [ ] **Step 1: Create `src/pages/DailyPage.tsx`**

```typescript
import { useDailyPuzzle } from '../hooks/useDailyPuzzle';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';
import { ShareButton } from '../components/ShareButton';

export function DailyPage() {
  const { puzzle, loading, error, state, savedResult, streak, submitGuess } =
    useDailyPuzzle();

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
          <GuessInput onSubmit={submitGuess} />
        )}

        {state.guesses.map((g, i) => (
          <div
            key={i}
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

- [ ] **Step 2: Commit**

```bash
git add src/pages/DailyPage.tsx
git commit -m "feat: add DailyPage"
```

---

## Task 18: EndlessPage + App + main entry

**Files:**
- Create: `src/pages/EndlessPage.tsx`
- Create: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `src/pages/EndlessPage.tsx`**

```typescript
import { useEffect } from 'react';
import { useEndlessGame } from '../hooks/useEndlessGame';
import { ClueDisplay } from '../components/ClueDisplay';
import { GuessInput } from '../components/GuessInput';
import { ResultOverlay } from '../components/ResultOverlay';

export function EndlessPage() {
  const { puzzle, loading, sessionScore, state, fetchNext, submitGuess } =
    useEndlessGame();

  useEffect(() => {
    fetchNext();
  }, []);

  if (loading && !puzzle) {
    return <div className="p-8 text-center text-gray-500">Loading…</div>;
  }

  if (!loading && !puzzle) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">No more movies available — impressive!</p>
      </div>
    );
  }

  if (!puzzle) return null;

  const isDone = state.result !== 'unanswered';

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span className="font-medium text-gray-700">Endless Mode</span>
        <span>Score: {sessionScore}</span>
      </div>

      <ClueDisplay
        clues={puzzle.clues}
        revealedDifficulty={state.revealedDifficulty}
      />

      <div className="mt-4 space-y-2">
        {!isDone && <GuessInput onSubmit={submitGuess} />}

        {!isDone &&
          state.guesses.map((g, i) => (
            <div
              key={i}
              className="rounded bg-red-50 px-3 py-1 text-sm text-red-600"
            >
              ✗ {g}
            </div>
          ))}

        {isDone && (
          <ResultOverlay
            result={state.result}
            movieTitle={puzzle.title}
            posterUrl={puzzle.posterUrl}
            difficulty={state.revealedDifficulty}
            onNext={fetchNext}
            isEndless
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/App.tsx`**

```typescript
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { DailyPage } from './pages/DailyPage';
import { EndlessPage } from './pages/EndlessPage';

export function App() {
  return (
    <BrowserRouter basename="/double-take">
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">🎬 Double Take</h1>
            <nav className="flex gap-4 text-sm font-medium">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  isActive
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-800'
                }
              >
                Daily
              </NavLink>
              <NavLink
                to="/play"
                className={({ isActive }) =>
                  isActive
                    ? 'text-indigo-600'
                    : 'text-gray-500 hover:text-gray-800'
                }
              >
                Endless
              </NavLink>
            </nav>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<DailyPage />} />
            <Route path="/play" element={<EndlessPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Replace `src/main.tsx`**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 4: Verify the app runs**

```bash
npm run dev
```

Open `http://localhost:5173/double-take/` in your browser. You should see the header with "Daily" and "Endless" nav links and today's puzzle loading from Supabase.

Test the golden path:
1. Daily page loads a clue
2. Type a wrong answer — second clue should appear
3. Type another wrong answer — third clue appears
4. Type the correct title — result overlay appears with the movie title and poster
5. Share button copies emoji grid to clipboard
6. Navigate to `/double-take/play` — endless mode loads a random movie

- [ ] **Step 5: Commit**

```bash
git add src/pages/EndlessPage.tsx src/App.tsx src/main.tsx
git commit -m "feat: add EndlessPage, App router, and main entry point"
```

---

## Task 19: GitHub Actions deploy to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Enable GitHub Pages in your repository**

1. Push the repo to GitHub: `git remote add origin https://github.com/YOUR_USERNAME/double-take.git && git push -u origin main`
2. In GitHub: Settings → Pages → Source → **GitHub Actions**

- [ ] **Step 2: Add Supabase secrets to GitHub**

In GitHub: Settings → Secrets and variables → Actions → New repository secret.

Add:
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon key

- [ ] **Step 3: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - uses: actions/configure-pages@v4

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Push and watch the deployment**

```bash
git add .github/
git commit -m "feat: add GitHub Actions deploy workflow"
git push origin main
```

Go to GitHub → Actions tab. The workflow should run and deploy. After ~2 minutes, your site is live at `https://YOUR_USERNAME.github.io/double-take/`.

- [ ] **Step 5: Verify the live site**

Open `https://YOUR_USERNAME.github.io/double-take/` in a browser. Test the daily puzzle and endless mode end-to-end on the deployed version.

---

## Task 20: Polish pass

These are small improvements to complete the MVP.

- [ ] **Step 1: Handle 404 for GitHub Pages SPA routing**

Create `public/404.html` — GitHub Pages serves this for unknown paths, but we redirect back to the app:

```html
<!doctype html>
<html>
  <head>
    <script>
      const path = window.location.pathname.replace('/double-take', '') || '/';
      window.location.replace('/double-take/#' + path);
    </script>
  </head>
</html>
```

Then replace `src/App.tsx` to use `HashRouter` instead of `BrowserRouter` (hash routing works reliably on GitHub Pages without a server):

```typescript
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { DailyPage } from './pages/DailyPage';
import { EndlessPage } from './pages/EndlessPage';

export function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">🎬 Double Take</h1>
            <nav className="flex gap-4 text-sm font-medium">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800'
                }
              >
                Daily
              </NavLink>
              <NavLink
                to="/play"
                className={({ isActive }) =>
                  isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800'
                }
              >
                Endless
              </NavLink>
            </nav>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<DailyPage />} />
            <Route path="/play" element={<EndlessPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
```

The `base` in `vite.config.ts` can remain `/double-take/` for assets.

- [ ] **Step 2: Add loading spinner for guess submission**

In `GuessInput.tsx`, add a `loading` prop and show a spinner:

```typescript
interface Props {
  onSubmit: (guess: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

// In the button:
{loading ? (
  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
) : (
  'Guess'
)}
```

- [ ] **Step 3: Add wrong-guess animation in DailyPage and EndlessPage**

In `DailyPage.tsx` and `EndlessPage.tsx`, when a wrong guess comes in, briefly add a shake class to the `GuessInput` wrapper. Add this to `src/index.css`:

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}
.shake { animation: shake 0.3s ease-in-out; }
```

Track a `shaking` boolean in both pages, set it true on wrong guess, reset after 300ms.

- [ ] **Step 4: Run the full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Run the TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Final commit and push**

```bash
git add -A
git commit -m "feat: polish pass — SPA routing, loading states, wrong-guess animation"
git push origin main
```

Wait for the GitHub Actions deploy to complete. Verify the final live site end-to-end.

---

## Post-MVP: expand the movie pool

Once the MVP is live, run these to expand to 200+ movies and reschedule:

```bash
cd scripts
python seed_movies.py 200
python seed_famous_roles.py
python generate_clues.py
python schedule_daily.py 90
```
