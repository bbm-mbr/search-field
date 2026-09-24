import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # LLM Farm — Anthropic vertex proxy
    model_farm_base_url: str = os.getenv("MODEL_FARM_BASE_URL", "https://aoai-farm.bosch-temp.com")
    model_farm_api_key: str = os.getenv("MODEL_FARM_API_KEY", "")
    analysis_model: str = os.getenv("ANALYSIS_MODEL", "claude-sonnet-4-6")
    utility_model: str = os.getenv("UTILITY_MODEL", "claude-haiku-4-5")

    # Azure OpenAI embeddings
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-large")
    azure_openai_endpoint: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    azure_openai_key: str = os.getenv("AZURE_OPENAI_KEY", "")
    azure_openai_api_version: str = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")

    # Search
    searxng_base_url: str = os.getenv("SEARXNG_BASE_URL", "")
    brave_api_key: str = os.getenv("BRAVE_SEARCH_API_KEY", "")

    # Paths
    playbook_dir: str = os.getenv("PLAYBOOK_DIR", "./playbook")
    chroma_dir: str = os.getenv("CHROMA_DIR", "./.chroma")
    cache_dir: str = os.getenv("CACHE_DIR", "./.cache")

    cors_origins: list = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

@lru_cache
def get_settings() -> Settings:
    return Settings()
