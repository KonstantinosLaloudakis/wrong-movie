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
    from tmdb import get_top_rated_movies

    supabase = get_client()
    seeded = 0
    page = 1
    seen_ids: set[int] = set()

    while seeded < target:
        batch = get_top_rated_movies(page)
        if not batch:
            break
        for m in batch:
            if seeded >= target:
                break
            if m["id"] in seen_ids:
                continue
            seen_ids.add(m["id"])
            if m.get("original_language") != "en":
                print(f"  Skipping non-English ({m.get('original_language')}): {m.get('title')}")
                continue
            try:
                seed_movie(supabase, m)
                seeded += 1
                time.sleep(0.1)
            except Exception as e:
                print(f"  Error seeding {m.get('title')}: {e}")
        page += 1


def deactivate_non_english_movies():
    """Mark any active movies with a non-English original_language as inactive."""
    from db import get_client
    from tmdb import get_movie_details

    supabase = get_client()
    movies = (
        supabase.table("movies")
        .select("id, title, tmdb_id")
        .eq("is_active", True)
        .execute()
        .data
    )
    print(f"Checking {len(movies)} active movies for language...")
    deactivated = 0
    for m in movies:
        try:
            details = get_movie_details(m["tmdb_id"])
            lang = details.get("original_language", "en")
            if lang != "en":
                supabase.table("movies").update({"is_active": False}).eq("id", m["id"]).execute()
                print(f"  Deactivated ({lang}): {m['title']}")
                deactivated += 1
            time.sleep(0.1)
        except Exception as e:
            print(f"  Error checking {m['title']}: {e}")
    print(f"Deactivated {deactivated} non-English movies.")


if __name__ == "__main__":
    import sys
    args = sys.argv[1:]
    if args and args[0] == "--deactivate-non-english":
        deactivate_non_english_movies()
    else:
        target = int(args[0]) if args else 100
        print(f"Seeding {target} movies...")
        seed_movies(target)
    print("Done.")
