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
    if to_schedule == 0:
        print("No eligible movies available; nothing scheduled.")
        return
    print(f"Scheduling {to_schedule} puzzles starting {start_date}...")

    for i in range(to_schedule):
        movie_id = available[i]
        puzzle_date = start_date + timedelta(days=i)

        clue_ids = {}
        skip_movie = False
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
            if not clue:
                print(f"  Warning: no active {diff} clue for movie {movie_id}, skipping")
                skip_movie = True
                break
            clue_ids[diff] = clue[0]["id"]
        if skip_movie:
            continue

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
