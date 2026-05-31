import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from generate_clues import is_valid_clue, build_cast_lines


def test_rejects_low_confidence():
    assert not is_valid_clue("A perfectly good clue here.", 0.5, "Movie Title", [])


def test_rejects_when_title_in_clue():
    assert not is_valid_clue(
        "This is about The Matrix somehow.",
        0.9,
        "The Matrix",
        [],
    )


def test_title_check_is_case_insensitive():
    assert not is_valid_clue(
        "the matrix is mentioned here.",
        0.9,
        "The Matrix",
        [],
    )


def test_rejects_when_character_name_in_clue():
    assert not is_valid_clue(
        "Neo fights Agent Smith in a simulation.",
        0.9,
        "The Matrix",
        ["Neo", "Trinity"],
    )


def test_rejects_too_short():
    assert not is_valid_clue("Short.", 0.9, "Movie", [])


def test_accepts_valid_clue():
    assert is_valid_clue(
        "A leather-clad hero from an epic ring-quest learns reality is a simulation.",
        0.85,
        "The Matrix",
        ["Neo", "Trinity", "Morpheus"],
    )


def test_build_cast_lines_formats_correctly():
    cast = [
        {
            "character_name": "Joel",
            "actor_name": "Jim Carrey",
            "role_name": "The Riddler",
            "source_movie_title": "Batman Forever",
        }
    ]
    result = build_cast_lines(cast)
    assert "Joel" in result
    assert "Jim Carrey" in result
    assert "The Riddler" in result
    assert "Batman Forever" in result
