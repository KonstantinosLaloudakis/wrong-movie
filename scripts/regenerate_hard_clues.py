"""Deactivate all hard clues and regenerate them with the improved prompt.
Medium and easy clues are left untouched — save_clues skips already-active difficulties."""
from db import get_client
from generate_clues import generate_all_clues

supabase = get_client()

result = supabase.table("clues").update({"is_active": False}).eq("difficulty", "hard").execute()
print(f"Deactivated {len(result.data)} hard clues.")

print("Regenerating hard clues for all active movies...")
generate_all_clues()
