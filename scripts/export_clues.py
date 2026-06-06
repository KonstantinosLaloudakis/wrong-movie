"""Export all active clues to clues_review.txt for manual review."""
from db import get_client

supabase = get_client()

movies = (
    supabase.table("movies")
    .select("id, title, release_year")
    .eq("is_active", True)
    .order("title")
    .execute()
    .data
)

lines = []
eligible = 0
for m in movies:
    clues = (
        supabase.table("clues")
        .select("difficulty, clue_text, quality_score, is_active")
        .eq("movie_id", m["id"])
        .eq("is_active", True)
        .execute()
        .data
    )
    diffs = {c["difficulty"] for c in clues}
    complete = diffs == {"hard", "medium", "easy"}
    if complete:
        eligible += 1

    lines.append(f"{'=' * 60}")
    lines.append(f"{m['title']} ({m['release_year']})" + ("" if complete else "  [INCOMPLETE]"))
    lines.append(f"{'=' * 60}")
    for diff in ("hard", "medium", "easy"):
        c = next((x for x in clues if x["difficulty"] == diff), None)
        if c:
            lines.append(f"[{diff.upper()}  conf={c['quality_score']:.2f}]")
            lines.append(f"  {c['clue_text']}")
        else:
            lines.append(f"[{diff.upper()}]  — missing —")
    lines.append("")

summary = [
    f"Double Take — Active Clues Export",
    f"Movies: {eligible} complete / {len(movies)} active",
    f"{'=' * 60}",
    "",
]

output = "\n".join(summary + lines)
out_path = "clues_review.txt"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(output)

print(f"Wrote {out_path}  ({len(movies)} movies, {eligible} complete)")
