-- Add imdb_id and release_year to both puzzle RPCs

CREATE OR REPLACE FUNCTION get_daily_puzzle(p_date date)
RETURNS TABLE (
  puzzle_number    int,
  movie_id         uuid,
  title            text,
  normalized_title text,
  alt_titles       text[],
  poster_url       text,
  imdb_id          text,
  release_year     int,
  clue_hard_id     uuid,
  clue_medium_id   uuid,
  clue_easy_id     uuid,
  hard_clue        text,
  medium_clue      text,
  easy_clue        text
) AS $$
  SELECT
    dp.puzzle_number,
    m.id,
    m.title,
    m.normalized_title,
    m.alt_titles,
    m.poster_url,
    m.imdb_id,
    m.release_year,
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

CREATE OR REPLACE FUNCTION get_random_movie(excluded_ids uuid[])
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
  ORDER BY RANDOM()
  LIMIT 1;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER;
