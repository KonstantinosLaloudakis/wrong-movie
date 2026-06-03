import json
import re
import time

MIN_CLUE_CONFIDENCE = {"hard": 0.2, "medium": 0.4, "easy": 0.6}
MIN_FAMOUSNESS_SCORE = 0.10  # used by legacy _get_cast_with_roles only

PROMPT_TEMPLATE = """You are writing clues for "Wrong Movie" — a trivia game where players identify
a movie from clues that swap its characters for the actors' famous roles from OTHER movies.

Step 1 — Pick famous roles:
For each actor listed, identify their single most recognizable role that is NOT from this movie.
Important checks before you choose:
- Verify the role is from a DIFFERENT film than the one being described
- Verify you have the right actor for that role (do not assign a role to the wrong person)
- If an actor's most famous role happens to be in this very movie, use their second-most-famous role

Step 2 — Write 3 clues using those roles. Every clue must:
- Replace the actual characters with the famous roles you chose
- End with a SHORT, specific hook that captures something unique about THIS movie
  (a date, location, mood, or one-line premise — not a plot summary)
- Never mention the movie's actual title or its real character names

Difficulty rules:

EASY — Name 3 famous roles directly + movie hook. Keep it punchy, 1 sentence.
  Example (for Eternal Sunshine of the Spotless Mind):
  "Frodo, Mary Jane and The Riddler have a very weird Valentine's Day"

MEDIUM — Hint at 2 famous roles indirectly using their iconic traits or setting (no character
names, no source film titles) + movie hook. 1-2 sentences.
  Example: "A ring-bearer and a web-slinger's ex discover their shared Valentine's Day has been
  professionally erased from their memories"

HARD — Cryptically describe just 1 famous role without naming it or its source film + movie hook.
Every word should point to a specific role, not a generic archetype.
The subject of your clue MUST be a specific famous CHARACTER from another film — not a setting,
situation, theme, or abstract concept. Start from the character, not the movie being clued.
  Good: "a barefoot adventurer burdened by a cursed precious object" (a specific person: Frodo)
  Bad:  "a reluctant hero" (too generic — could be anyone)
  Bad:  "a chamber where citizens deliberate over a verdict" (describes the MOVIE's setting, not a
        famous role — if your clue has no specific famous character as its subject, rewrite it)
  Example: "A barefoot adventurer burdened by a cursed precious object wakes up on Valentine's Day
  with no memory of the woman he loved"

Movie: {title} ({year})
Plot: {plot}

Forbidden names — these are the actual characters in this movie, never use them as famous role references:
{character_names}

Cast:
{cast_lines}

Respond ONLY with valid JSON, no other text:
{{
  "easy":   {{ "clue": "...", "confidence": 0.0 }},
  "medium": {{ "clue": "...", "confidence": 0.0 }},
  "hard":   {{ "clue": "...", "confidence": 0.0 }}
}}

confidence = how likely a knowledgeable moviegoer can identify the film from this clue alone (1.0 = certain)."""


def build_cast_lines(cast_actors: list[dict]) -> str:
    return "\n".join(f"- {c['actor_name']}" for c in cast_actors)


def is_valid_clue(
    clue_text: str,
    confidence: float,
    movie_title: str,
    character_names: list[str],
    difficulty: str = "easy",
) -> bool:
    threshold = MIN_CLUE_CONFIDENCE.get(difficulty, 0.6) if isinstance(MIN_CLUE_CONFIDENCE, dict) else MIN_CLUE_CONFIDENCE
    if confidence < threshold:
        return False
    if len(clue_text.strip()) < 20:
        return False
    if movie_title and movie_title.lower() in clue_text.lower():
        return False
    for name in character_names:
        if name and name.lower() in clue_text.lower():
            return False
    return True


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        text = text.rsplit("```", 1)[0]
    return text.strip()


def _call_llm(prompt: str) -> dict | None:
    import anthropic
    from config import ANTHROPIC_MODEL, ANTHROPIC_API_KEY

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    try:
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        return json.loads(_strip_code_fences(response.content[0].text))
    except (json.JSONDecodeError, anthropic.APIError, IndexError, AttributeError):
        return None


def generate_clues_for_movie(movie: dict, cast_actors: list[dict]) -> dict | None:
    if len(cast_actors) < 2:
        return None

    character_names = ", ".join(c["character_name"] for c in cast_actors if c["character_name"])
    prompt = PROMPT_TEMPLATE.format(
        title=movie["title"],
        year=movie["release_year"],
        plot=movie.get("plot_summary") or "No plot available.",
        character_names=character_names,
        cast_lines=build_cast_lines(cast_actors),
    )

    result = _call_llm(prompt)
    if result is None:
        time.sleep(2)
        result = _call_llm(prompt)  # one retry
    return result


def _get_cast_actors(supabase, movie_id: str) -> list[dict]:
    """Return top cast members (actor name + character name for validation)."""
    cast_rows = (
        supabase.table("movie_cast")
        .select("character_name, actors(name)")
        .eq("movie_id", movie_id)
        .order("cast_order")
        .limit(6)
        .execute()
        .data
    )
    return [
        {"actor_name": row["actors"]["name"], "character_name": row["character_name"]}
        for row in cast_rows
    ]


def _get_cast_with_roles(supabase, movie_id: str, active_movie_titles: set[str]) -> list[dict]:
    """Legacy: return cast members with pre-seeded famous roles (used by debug scripts)."""
    cast_rows = (
        supabase.table("movie_cast")
        .select("character_name, actors(id, name, tmdb_id)")
        .eq("movie_id", movie_id)
        .order("cast_order")
        .execute()
        .data
    )

    excluded_titles = {t.lower() for t in active_movie_titles}
    used_source_movies: set[str] = set()
    result = []

    for row in cast_rows:
        actor = row["actors"]
        roles = (
            supabase.table("famous_roles")
            .select("role_name, source_movie_title, source_movie_year, famousness_score")
            .eq("actor_id", actor["id"])
            .order("famousness_score", desc=True)
            .execute()
            .data
        )
        best_role = next(
            (
                r for r in roles
                if r["source_movie_title"].lower() not in excluded_titles
                and r["source_movie_title"].lower() not in used_source_movies
                and r["famousness_score"] >= MIN_FAMOUSNESS_SCORE
            ),
            None,
        )
        if best_role:
            used_source_movies.add(best_role["source_movie_title"].lower())
            result.append({
                "character_name": row["character_name"],
                "actor_name": actor["name"],
                "role_name": best_role["role_name"],
                "source_movie_title": best_role["source_movie_title"],
            })
    return result


def save_clues(supabase, movie: dict, clues_json: dict, character_names: list[str]):
    from config import ANTHROPIC_MODEL

    already_active = {
        r["difficulty"]
        for r in supabase.table("clues")
            .select("difficulty")
            .eq("movie_id", movie["id"])
            .eq("is_active", True)
            .execute()
            .data
    }

    for difficulty in ("hard", "medium", "easy"):
        if difficulty in already_active:
            continue
        entry = clues_json.get(difficulty, {})
        clue_text = entry.get("clue", "")
        confidence = float(entry.get("confidence", 0.0))
        if not clue_text:
            continue
        active = is_valid_clue(clue_text, confidence, movie["title"], character_names, difficulty)

        supabase.table("clues").insert({
            "movie_id": movie["id"],
            "clue_text": clue_text,
            "difficulty": difficulty,
            "quality_score": confidence,
            "is_active": active,
            "generation_model": ANTHROPIC_MODEL,
        }).execute()


def generate_all_clues(force: bool = False):
    from db import get_client

    supabase = get_client()

    movies = (
        supabase.table("movies")
        .select("id, title, release_year, plot_summary, tmdb_id")
        .eq("is_active", True)
        .execute()
        .data
    )

    for movie in movies:
        existing = (
            supabase.table("clues")
            .select("difficulty")
            .eq("movie_id", movie["id"])
            .eq("is_active", True)
            .execute()
            .data
        )
        existing_diffs = {r["difficulty"] for r in existing}

        if not force and {"hard", "medium", "easy"} == existing_diffs:
            print(f"  Skipping (already has clues): {movie['title']}")
            continue

        try:
            cast_actors = _get_cast_actors(supabase, movie["id"])

            if len(cast_actors) < 2:
                print(f"  SKIP (insufficient cast data): {movie['title']}")
                continue

            clues_json = generate_clues_for_movie(movie, cast_actors)

            if clues_json is None:
                print(f"  SKIP (LLM returned no valid JSON): {movie['title']}")
                continue

            if force and existing_diffs:
                supabase.table("clues").update({"is_active": False}).eq("movie_id", movie["id"]).execute()

            character_names = [c["character_name"] for c in cast_actors]
            save_clues(supabase, movie, clues_json, character_names)
            print(f"  OK: {movie['title']}")
            time.sleep(0.5)
        except Exception as e:
            print(f"  ERROR for {movie['title']}: {e}")

    print("Done.")


if __name__ == "__main__":
    import sys
    generate_all_clues(force="--force" in sys.argv)
