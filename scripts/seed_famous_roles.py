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

        response = supabase.table("famous_roles").upsert(
            {
                "actor_id": actor["id"],
                "role_name": credit["character"],
                "source_movie_title": credit["title"],
                "source_movie_year": year,
                "famousness_score": famousness_score(credit),
            },
            on_conflict="actor_id,source_movie_title",
        ).execute()
        if response.data:
            inserted += 1

    return inserted


def seed_famous_roles():
    supabase = get_client()
    actors = supabase.table("actors").select("id,name,tmdb_id").execute().data or []
    if not actors:
        print("No actors found. Run seed_movies.py first.")
        return
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
