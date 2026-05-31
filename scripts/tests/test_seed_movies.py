import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from seed_movies import normalize_title


def test_strips_leading_the():
    assert normalize_title("The Matrix") == "matrix"


def test_strips_leading_a():
    assert normalize_title("A Beautiful Mind") == "beautiful mind"


def test_strips_leading_an():
    assert normalize_title("An American Werewolf in London") == "american werewolf in london"


def test_lowercases():
    assert normalize_title("FORREST GUMP") == "forrest gump"


def test_strips_punctuation():
    assert normalize_title("Schindler's List") == "schindlers list"


def test_collapses_whitespace():
    assert normalize_title("  Blade   Runner  ") == "blade runner"


def test_does_not_strip_the_mid_title():
    assert normalize_title("From the Earth to the Moon") == "from the earth to the moon"


def test_handles_numbers():
    assert normalize_title("Se7en") == "se7en"
