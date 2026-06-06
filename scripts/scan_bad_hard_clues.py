"""Scan all active hard clues and flag any that describe the movie's plot/setting
instead of a famous role from another film.

Uses a batched LLM call per chunk to keep API cost low.
Outputs a list of movies whose hard clue needs regeneration.
"""
import json
import sys
from db import get_client
import anthropic
from config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL

BATCH_SIZE = 20

EVAL_PROMPT = """You are auditing clues for "Double Take" — a game where hard clues must
cryptically describe a famous character from ANOTHER film, not describe the movie being clued.

For each clue below, answer YES if it describes a specific famous character/role from another film,
or NO if it instead describes the movie's own plot, setting, theme, or situation.

Clues to evaluate (JSON array of objects with "id" and "clue"):
{clues_json}

Respond ONLY with a JSON array of objects: [{{"id": ..., "ok": true/false, "reason": "one short line"}}]
"""

def evaluate_batch(client, batch: list[dict]) -> list[dict]:
    prompt = EVAL_PROMPT.format(clues_json=json.dumps(batch, ensure_ascii=False))
    try:
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            text = text.rsplit("```", 1)[0]
        return json.loads(text)
    except Exception as e:
        print(f"  [batch eval error] {e}", file=sys.stderr)
        return []


def main():
    supabase = get_client()
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    movies = {
        m["id"]: m["title"]
        for m in supabase.table("movies").select("id, title").eq("is_active", True).execute().data
    }

    hard_clues = (
        supabase.table("clues")
        .select("id, movie_id, clue_text")
        .eq("difficulty", "hard")
        .eq("is_active", True)
        .execute()
        .data
    )

    print(f"Evaluating {len(hard_clues)} active hard clues in batches of {BATCH_SIZE}...")

    flagged = []

    for i in range(0, len(hard_clues), BATCH_SIZE):
        chunk = hard_clues[i : i + BATCH_SIZE]
        batch = [{"id": c["id"], "clue": c["clue_text"]} for c in chunk]
        results = evaluate_batch(client, batch)

        id_to_result = {r["id"]: r for r in results}

        for clue in chunk:
            result = id_to_result.get(clue["id"])
            if result and not result.get("ok", True):
                title = movies.get(clue["movie_id"], clue["movie_id"])
                flagged.append({
                    "title": title,
                    "movie_id": clue["movie_id"],
                    "clue": clue["clue_text"],
                    "reason": result.get("reason", ""),
                })

        print(f"  Processed {min(i + BATCH_SIZE, len(hard_clues))}/{len(hard_clues)}")

    print(f"\n=== {len(flagged)} clues flagged as plot descriptions ===\n")
    for item in sorted(flagged, key=lambda x: x["title"]):
        print(f"  {item['title']}")
        print(f"    Clue:   {item['clue']}")
        print(f"    Reason: {item['reason']}")
        print()

    if flagged:
        print("To regenerate a flagged movie's hard clue:")
        print("  python regen_one_movie.py \"<title>\"")
        print("\nTo regenerate all flagged movies at once:")
        titles = [item["title"] for item in flagged]
        print(f"  python regen_one_movie.py " + ' && python regen_one_movie.py '.join(f'"{t}"' for t in titles[:5]))
        if len(titles) > 5:
            print(f"  ... and {len(titles) - 5} more")


if __name__ == "__main__":
    main()
