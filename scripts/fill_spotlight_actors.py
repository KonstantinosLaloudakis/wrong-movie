"""
Looks up actor UUIDs from Supabase and patches src/config/spotlights.ts
in-place, replacing 'REPLACE_WITH_ACTUAL_UUID' placeholders.

Usage:
    cd scripts && python fill_spotlight_actors.py

Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY in config.py / .env
Run seed_movies.py first so actors exist in the DB.
"""
import sys
import os
import re

sys.path.insert(0, os.path.dirname(__file__))

from db import get_client

SPOTLIGHTS_TS = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "src", "config", "spotlights.ts")
)

PLACEHOLDER = "'REPLACE_WITH_ACTUAL_UUID'"


def extract_actor_names(content: str) -> list[str]:
    """Pull the display names of actor entries that still have a placeholder UUID."""
    pattern = r"name:\s*'([^']+)'[^}]*actorId:\s*'REPLACE_WITH_ACTUAL_UUID'"
    return re.findall(pattern, content, flags=re.DOTALL)


def patch_actor_uuid(content: str, actor_name: str, uuid: str) -> str:
    """Replace the first placeholder UUID that appears after actor_name in the file."""
    name_marker = f"name: '{actor_name}'"
    name_pos = content.find(name_marker)
    if name_pos == -1:
        return content  # name not found, nothing to do

    placeholder_pos = content.find(PLACEHOLDER, name_pos)
    if placeholder_pos == -1 or placeholder_pos - name_pos > 300:
        return content  # placeholder too far away, skip

    return content[:placeholder_pos] + f"'{uuid}'" + content[placeholder_pos + len(PLACEHOLDER):]


def fill_spotlight_actors() -> None:
    with open(SPOTLIGHTS_TS, "r", encoding="utf-8") as f:
        content = f.read()

    actors_needed = extract_actor_names(content)
    if not actors_needed:
        print("No placeholder UUIDs found in spotlights.ts — nothing to do.")
        return

    print(f"Looking up {len(actors_needed)} actors: {', '.join(actors_needed)}")

    supabase = get_client()
    result = supabase.table("actors").select("id, name").in_("name", actors_needed).execute()
    found = {row["name"]: row["id"] for row in result.data}

    missing = [name for name in actors_needed if name not in found]
    if missing:
        print(f"\nWARNING: Not found in DB: {', '.join(missing)}")
        print("Run seed_movies.py first, or check name spelling.")

    if not found:
        print("No actors found. Aborting.")
        return

    for name, uuid in found.items():
        new_content = patch_actor_uuid(content, name, uuid)
        if new_content != content:
            print(f"  Patched: {name} -> {uuid}")
            content = new_content
        else:
            print(f"  WARNING: Could not patch pattern for '{name}'")

    with open(SPOTLIGHTS_TS, "w", encoding="utf-8") as f:
        f.write(content)

    remaining = extract_actor_names(content)
    if remaining:
        print(f"\nStill unresolved: {', '.join(remaining)}")
    else:
        print(f"\nAll placeholders resolved. spotlights.ts updated.")


if __name__ == "__main__":
    fill_spotlight_actors()
