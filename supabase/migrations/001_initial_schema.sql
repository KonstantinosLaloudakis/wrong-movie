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
  famousness_score   float NOT NULL DEFAULT 0.0 CHECK (famousness_score >= 0.0 AND famousness_score <= 1.0),
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
  quality_score    float NOT NULL DEFAULT 0.0 CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
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
