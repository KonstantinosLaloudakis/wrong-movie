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
