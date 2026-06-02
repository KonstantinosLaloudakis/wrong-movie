import httpx
from config import TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE_URL


def _get(path: str, params: dict | None = None, **kwargs) -> dict:
    with httpx.Client(timeout=15) as client:
        resp = client.get(
            f"{TMDB_BASE_URL}{path}",
            params={"api_key": TMDB_API_KEY, **(params or {}), **kwargs},
        )
        resp.raise_for_status()
        return resp.json()


def get_popular_movies(page: int = 1) -> list[dict]:
    return _get("/movie/popular", page=page)["results"]


def get_top_rated_movies(page: int = 1) -> list[dict]:
    return _get("/movie/top_rated", page=page)["results"]


def get_popular_movies_by_era(year_from: int, year_to: int, page: int = 1) -> list[dict]:
    """Discover English-language movies from a year range, sorted by popularity."""
    return _get(
        "/discover/movie",
        params={
            "with_original_language": "en",
            "sort_by": "popularity.desc",
            "vote_count.gte": 1000,
            "primary_release_date.gte": f"{year_from}-01-01",
            "primary_release_date.lte": f"{year_to}-12-31",
            "page": page,
        },
    )["results"]


def get_movie_details(tmdb_id: int) -> dict:
    return _get(f"/movie/{tmdb_id}")


def get_movie_credits(tmdb_id: int) -> dict:
    return _get(f"/movie/{tmdb_id}/credits")


def get_person_movie_credits(tmdb_id: int) -> dict:
    return _get(f"/person/{tmdb_id}/movie_credits")


def poster_url(poster_path: str | None) -> str | None:
    if not poster_path:
        return None
    return f"{TMDB_IMAGE_BASE_URL}{poster_path}"
