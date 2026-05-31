"""Re-evaluate is_active on all existing clues using the new per-difficulty thresholds."""
from db import get_client
from generate_clues import is_valid_clue

supabase = get_client()

clues = supabase.table("clues").select("id, clue_text, difficulty, quality_score").execute().data
print(f"Re-evaluating {len(clues)} clues...")

activated = 0
deactivated = 0
for clue in clues:
    active = is_valid_clue(
        clue["clue_text"],
        clue["quality_score"],
        "",  # title/character checks already passed at generation time
        [],
        clue["difficulty"],
    )
    supabase.table("clues").update({"is_active": active}).eq("id", clue["id"]).execute()
    if active:
        activated += 1
    else:
        deactivated += 1

print(f"  Active: {activated}, Inactive: {deactivated}")
print("Done.")
