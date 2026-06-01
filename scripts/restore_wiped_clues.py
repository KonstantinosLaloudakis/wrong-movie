"""One-time fix: reactivate the best pre-existing clue per difficulty for movies
that had their clues force-wiped but then got skipped (no qualifying cast)."""
from db import get_client
from generate_clues import is_valid_clue, MIN_CLUE_CONFIDENCE

supabase = get_client()

movies = supabase.table("movies").select("id, title").eq("is_active", True).execute().data

restored = 0
for m in movies:
    active = supabase.table("clues").select("difficulty").eq("movie_id", m["id"]).eq("is_active", True).execute().data
    active_diffs = {c["difficulty"] for c in active}

    missing = {"hard", "medium", "easy"} - active_diffs
    if not missing:
        continue

    for diff in missing:
        # Find the best inactive clue for this difficulty
        candidates = (
            supabase.table("clues")
            .select("id, clue_text, quality_score")
            .eq("movie_id", m["id"])
            .eq("difficulty", diff)
            .eq("is_active", False)
            .order("quality_score", desc=True)
            .execute()
            .data
        )
        best = next(
            (c for c in candidates if c["quality_score"] >= MIN_CLUE_CONFIDENCE.get(diff, 0.6)),
            None,
        )
        if best:
            supabase.table("clues").update({"is_active": True}).eq("id", best["id"]).execute()
            print(f"  Restored [{diff} conf={best['quality_score']:.2f}]: {m['title']}")
            restored += 1

print(f"\nRestored {restored} clues.")
