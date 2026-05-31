import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
TMDB_API_KEY = os.environ["TMDB_API_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
MAX_CAST_PER_MOVIE = 6
MIN_CLUE_CONFIDENCE = {"hard": 0.2, "medium": 0.4, "easy": 0.6}
