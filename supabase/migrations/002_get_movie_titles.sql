CREATE OR REPLACE FUNCTION get_movie_titles()
RETURNS TABLE(title text)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT title FROM movies WHERE is_active = true ORDER BY title;
$$;

GRANT EXECUTE ON FUNCTION get_movie_titles() TO anon;
