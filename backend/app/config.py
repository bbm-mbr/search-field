"""Settings, read from the environment (backend/.env locally, app settings in Azure).

The corporate proxy is exported into os.environ so httpx picks it up for every
LLM Farm call. aoai-farm.bosch-temp.com does not resolve without it — a DNS
failure on that host means the proxy is missing, not that the farm is down.
"""
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


class Settings:
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{(BACKEND_DIR / 'searchfield.db').as_posix()}")
    seed_dir: Path = BACKEND_DIR / "seed"
    cors_origins: list = [o for o in os.getenv("CORS_ORIGINS", "http://localhost:5190").split(",") if o]

    # LLM Farm
    farm_base_url: str = os.getenv("LLM_FARM_BASE_URL", "https://aoai-farm.bosch-temp.com")
    farm_api_key: str = os.getenv("LLM_FARM_API_KEY", "")
    anthropic_version: str = os.getenv("ANTHROPIC_VERSION", "vertex-2023-10-16")
    azure_api_version: str = os.getenv("AZURE_API_VERSION", "2025-04-01-preview")
    https_proxy: str = os.getenv("HTTPS_PROXY", "")
    no_proxy: str = os.getenv("NO_PROXY", "localhost,127.0.0.1")

    # Monthly web-search caps for this app. Google's free grounded allowance
    # (5,000/month) is shared with Mobility Intelligence, so this app claims
    # well under half of it. Anthropic web search is billed per search.
    grounded_monthly_cap: int = int(os.getenv("GROUNDED_MONTHLY_CAP", "1500"))
    anthropic_search_monthly_cap: int = int(os.getenv("ANTHROPIC_SEARCH_MONTHLY_CAP", "300"))


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.https_proxy:
        os.environ["HTTPS_PROXY"] = s.https_proxy
        os.environ.setdefault("NO_PROXY", s.no_proxy)
    return s
