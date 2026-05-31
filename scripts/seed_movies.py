import re
import time


def normalize_title(title: str) -> str:
    t = title.lower().strip()
    t = re.sub(r"^(the|a|an)\s+", "", t)
    t = re.sub(r"[^\w\s]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def seed_movie(supabase, tmdb_movie: dict) -> str | None:
    """Insert or skip a movie. Returns the movie UUID."""
    from tmdb import get_movie_details, get_movie_credits, poster_url
    from config import MAX_CAST_PER_MOVIE

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
    from db import get_client
    from tmdb import get_popular_movies, get_top_rated_movies

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
                time.sleep(0.1)
            except Exception as e:
                print(f"  Error seeding {m.get('title')}: {e}")
        page += 1


if __name__ == "__main__":
    import sys
    target = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    print(f"Seeding {target} movies...")
    seed_movies(target)
    print("Done.")
