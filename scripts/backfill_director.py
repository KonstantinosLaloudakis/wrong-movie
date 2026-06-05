"""
Backfills director_name on movies that were seeded before the column existed.

Usage:
    cd scripts && python backfill_director.py

Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY, TMDB_API_KEY in config.py / .env
"""
import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

from db import get_client
from tmdb import get_movie_credits


def backfill_director() -> None:
    supabase = get_client()

    movies = (
        supabase.table("movies")
        .select("id, title, tmdb_id")
        .is_("director_name", "null")
        .eq("is_active", True)
        .execute()
        .data
    )

    print(f"Found {len(movies)} active movies without director_name")
    if not movies:
        print("Nothing to do.")
        return

    updated = 0
    failed = 0

    for m in movies:
        try:
            credits = get_movie_credits(m["tmdb_id"])
            director = next(
                (
                    member["name"]
                    for member in credits.get("crew", [])
                    if member.get("job") == "Director"
                ),
                None,
            )
            supabase.table("movies").update({"director_name": director}).eq("id", m["id"]).execute()
            print(f"  {m['title']} -> {director or '(no director found)'}")
            updated += 1
            time.sleep(0.15)  # stay within TMDb rate limit
        except Exception as e:
            print(f"  ERROR {m['title']}: {e}")
            failed += 1

    print(f"\nDone. Updated: {updated}  Failed: {failed}")


if __name__ == "__main__":
    backfill_director()
