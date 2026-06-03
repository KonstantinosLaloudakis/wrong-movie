"""Regenerate hard clues for a list of movies (deactivates all clues, regenerates all three)."""
import time
from db import get_client
from generate_clues import generate_clues_for_movie, save_clues, _get_cast_actors

MOVIES_TO_REGEN = [
    "12 Angry Men",
    "A Nightmare on Elm Street Part 2: Freddy's Revenge",
    "American Beauty",
    "Apocalypto",
    "Batman: The Dark Knight Returns, Part 2",
    "City Lights",
    "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb",
    "Feast",
    "Five Feet Apart",
    "Friday the 13th Part III",
    "Gabriel's Inferno",
    "Gabriel's Inferno: Part II",
    "Gone with the Wind",
    "Home Alone 3",
    "Limelight",
    "Mary and Max",
    "Meet Joe Black",
    "Modern Times",
    "Mulan",
    "Nimona",
    "Once Upon a Studio",
    "Platoon",
    "Scary Movie",
    "Sing Street",
    "Swapped",
    "TAYLOR SWIFT | THE ERAS TOUR",
    "Tango & Cash",
    "Taylor Swift: Reputation Stadium Tour",
    "Teen Titans: Trouble in Tokyo",
    "The Breadwinner",
    "The Gods Must Be Crazy",
    "The Great Dictator",
    "The Human Centipede (First Sequence)",
    "The Kid",
    "The Notebook",
    "The Running Man",
    "War Room",
    "¿Quieres ser mi hijo?",
]

def regen_movie(supabase, title: str):
    movies = (
        supabase.table("movies")
        .select("id, title, release_year, plot_summary")
        .ilike("title", title)
        .execute()
        .data
    )
    if not movies:
        print(f"  SKIP (not found): {title}")
        return
    if len(movies) > 1:
        print(f"  SKIP (multiple matches): {[m['title'] for m in movies]}")
        return

    movie = movies[0]
    supabase.table("clues").update({"is_active": False}).eq("movie_id", movie["id"]).execute()

    cast_actors = _get_cast_actors(supabase, movie["id"])
    if len(cast_actors) < 2:
        print(f"  SKIP (insufficient cast): {title}")
        return

    clues_json = generate_clues_for_movie(movie, cast_actors)
    if clues_json is None:
        print(f"  ERROR (LLM returned None): {title}")
        return

    character_names = [c["character_name"] for c in cast_actors]
    save_clues(supabase, movie, clues_json, character_names)

    hard = clues_json.get("hard", {})
    print(f"  OK: {movie['title']}")
    print(f"    [HARD conf={hard.get('confidence', '?')}] {hard.get('clue', '')}")


def main():
    supabase = get_client()
    total = len(MOVIES_TO_REGEN)
    for i, title in enumerate(MOVIES_TO_REGEN, 1):
        print(f"[{i}/{total}] {title}")
        regen_movie(supabase, title)
        time.sleep(1)
    print("\nDone.")


if __name__ == "__main__":
    main()
