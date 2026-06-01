from db import get_client

supabase = get_client()

movies = supabase.table("movies").select("id, title").eq("is_active", True).execute().data
eligible = 0
for m in movies:
    clues = supabase.table("clues").select("difficulty").eq("movie_id", m["id"]).eq("is_active", True).execute().data
    diffs = {c["difficulty"] for c in clues}
    if diffs == {"hard", "medium", "easy"}:
        eligible += 1

print(f"Eligible movies (all 3 active clues): {eligible}/{len(movies)}")

# Sample confidence scores by difficulty
for diff in ("hard", "medium", "easy"):
    clues = supabase.table("clues").select("quality_score, is_active").eq("difficulty", diff).execute().data
    active = sum(1 for c in clues if c["is_active"])
    scores = [c["quality_score"] for c in clues]
    avg = sum(scores) / len(scores) if scores else 0
    print(f"  {diff}: {active}/{len(clues)} active, avg confidence={avg:.2f}")
