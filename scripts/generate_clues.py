import json
import time

MIN_CLUE_CONFIDENCE = 0.65  # matches config.py

PROMPT_TEMPLATE = """You are writing clues for a movie trivia game called "Wrong Movie".

Rules:
- Describe the movie's plot using actors' FAMOUS ROLES from OTHER movies instead of actual character names
- Never mention the movie's actual title
- Never use the movie's actual character names
- Each clue must be 1-3 sentences
- A player who knows the actors should be able to figure out the real movie

Generate exactly 3 clues at different difficulty levels:

HARD: Describe the plot abstractly. Do NOT use the famous role names at all.
Use conceptual descriptions only (e.g. "a caped crusader's nemesis", "a fellowship's reluctant hero").

MEDIUM: Use indirect references to the famous roles
(e.g. "a Gotham villain", "a hobbit-like figure").

EASY: Directly substitute famous role names for the actual characters
(e.g. "The Riddler hires Frodo to erase his ex from his memory").

Movie: {title} ({year})
Plot: {plot}

Cast:
{cast_lines}

Respond ONLY with valid JSON, no other text:
{{
  "hard":   {{ "clue": "...", "confidence": 0.0 }},
  "medium": {{ "clue": "...", "confidence": 0.0 }},
  "easy":   {{ "clue": "...", "confidence": 0.0 }}
}}

confidence = how likely a movie-literate player can solve this clue (1.0 = very guessable)."""


def build_cast_lines(cast_with_roles: list[dict]) -> str:
    lines = [
        f"- {c['character_name']} is played by {c['actor_name']}, "
        f"famous for playing {c['role_name']} in {c['source_movie_title']}"
        for c in cast_with_roles
    ]
    return "\n".join(lines)


def is_valid_clue(
    clue_text: str,
    confidence: float,
    movie_title: str,
    character_names: list[str],
) -> bool:
    if confidence < MIN_CLUE_CONFIDENCE:
        return False
    if len(clue_text.strip()) < 20:
        return False
    if movie_title.lower() in clue_text.lower():
        return False
    for name in character_names:
        if name and name.lower() in clue_text.lower():
            return False
    return True


def _call_llm(prompt: str) -> dict | None:
    import anthropic
    from config import ANTHROPIC_MODEL, ANTHROPIC_API_KEY

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    try:
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=700,
            messages=[{"role": "user", "content": prompt}],
        )
        return json.loads(response.content[0].text)
    except (json.JSONDecodeError, anthropic.APIError):
        return None


def generate_clues_for_movie(movie: dict, cast_with_roles: list[dict]) -> dict | None:
    if not cast_with_roles:
        return None

    prompt = PROMPT_TEMPLATE.format(
        title=movie["title"],
        year=movie["release_year"],
        plot=movie.get("plot_summary") or "No plot available.",
        cast_lines=build_cast_lines(cast_with_roles),
    )

    result = _call_llm(prompt)
    if result is None:
        time.sleep(2)
        result = _call_llm(prompt)  # one retry
    return result


def _get_cast_with_roles(supabase, movie_id: str, active_movie_tmdb_ids: set[int]) -> list[dict]:
    """Return cast members that have a famous role not in our own movie pool."""
    cast_rows = (
        supabase.table("movie_cast")
        .select("character_name, actors(id, name, tmdb_id)")
        .eq("movie_id", movie_id)
        .order("cast_order")
        .execute()
        .data
    )

    result = []
    for row in cast_rows:
        actor = row["actors"]
        # Get the actor's best famous role that is NOT from a movie in our pool
        roles = (
            supabase.table("famous_roles")
            .select("role_name, source_movie_title, source_movie_year, famousness_score")
            .eq("actor_id", actor["id"])
            .order("famousness_score", desc=True)
            .execute()
            .data
        )
        # Pick first role whose source movie is not in our pool
        best_role = next(
            (r for r in roles if r["source_movie_title"].lower() not in
             {t.lower() for t in active_movie_tmdb_ids}),
            roles[0] if roles else None,
        )
        if best_role:
            result.append({
                "character_name": row["character_name"],
                "actor_name": actor["name"],
                "role_name": best_role["role_name"],
                "source_movie_title": best_role["source_movie_title"],
            })
    return result


def save_clues(supabase, movie: dict, clues_json: dict, character_names: list[str]):
    from config import ANTHROPIC_MODEL

    for difficulty in ("hard", "medium", "easy"):
        entry = clues_json.get(difficulty, {})
        clue_text = entry.get("clue", "")
        confidence = float(entry.get("confidence", 0.0))
        active = is_valid_clue(clue_text, confidence, movie["title"], character_names)

        supabase.table("clues").insert({
            "movie_id": movie["id"],
            "clue_text": clue_text,
            "difficulty": difficulty,
            "quality_score": confidence,
            "is_active": active,
            "generation_model": ANTHROPIC_MODEL,
        }).execute()


def generate_all_clues():
    from db import get_client

    supabase = get_client()

    movies = (
        supabase.table("movies")
        .select("id, title, release_year, plot_summary, tmdb_id")
        .eq("is_active", True)
        .execute()
        .data
    )

    # Build set of all movie titles in our pool to detect famous-role conflicts
    active_titles = {m["title"] for m in movies}

    for movie in movies:
        # Skip if already has active clues for all 3 difficulties
        existing = (
            supabase.table("clues")
            .select("difficulty")
            .eq("movie_id", movie["id"])
            .eq("is_active", True)
            .execute()
            .data
        )
        existing_diffs = {r["difficulty"] for r in existing}
        if {"hard", "medium", "easy"} == existing_diffs:
            print(f"  Skipping (already has clues): {movie['title']}")
            continue

        cast_with_roles = _get_cast_with_roles(supabase, movie["id"], active_titles)
        clues_json = generate_clues_for_movie(movie, cast_with_roles)

        if clues_json is None:
            print(f"  Failed to generate clues for: {movie['title']}")
            continue

        character_names = [c["character_name"] for c in cast_with_roles]
        save_clues(supabase, movie, clues_json, character_names)
        print(f"  Generated clues for: {movie['title']}")
        time.sleep(0.5)  # avoid rate limiting

    print("Done.")


if __name__ == "__main__":
    generate_all_clues()
