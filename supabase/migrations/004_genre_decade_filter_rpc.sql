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
