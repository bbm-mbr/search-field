"""Embeddings via Azure OpenAI, with local sentence-transformers fallback.

Azure endpoint: https://<resource>.cognitiveservices.azure.com
Auth: api-key header (handled by AzureOpenAI SDK)
Model/deployment: text-embedding-3-large
"""
from ..config import get_settings

_settings = get_settings()
_local_model = None
_azure_client = None


def _get_azure_client():
    global _azure_client
    if _azure_client is None:
        from openai import AzureOpenAI
        _azure_client = AzureOpenAI(
            azure_endpoint=_settings.azure_openai_endpoint,
            api_key=_settings.azure_openai_key,
            api_version=_settings.azure_openai_api_version,
        )
    return _azure_client


def embed(texts: list[str]) -> list[list[float]]:
    if _settings.azure_openai_endpoint and _settings.azure_openai_key:
        client = _get_azure_client()
        resp = client.embeddings.create(
            model=_settings.embedding_model,
            input=texts,
        )
        return [d.embedding for d in resp.data]

    # Free local fallback (CPU-friendly, Apache-2.0)
    global _local_model
    if _local_model is None:
        from sentence_transformers import SentenceTransformer
        _local_model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return _local_model.encode(texts, normalize_embeddings=True).tolist()
