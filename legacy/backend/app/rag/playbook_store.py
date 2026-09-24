"""RAG over the Search-Field playbook (and any other Bosch strategy docs).

Drop PDFs into PLAYBOOK_DIR, call ingest() once, then query() at analysis
time. Every framework agent receives the top playbook passages so the LLM
stays anchored to Bosch's own methodology instead of inventing one.
"""
import os
import hashlib
import chromadb
from pypdf import PdfReader
from ..config import get_settings
from ..llm.embeddings import embed

_settings = get_settings()
_client = chromadb.PersistentClient(path=_settings.chroma_dir)
_collection = _client.get_or_create_collection("playbook")


def _chunks(text: str, size: int = 1200, overlap: int = 200):
    step = size - overlap
    for i in range(0, max(len(text) - overlap, 1), step):
        yield text[i:i + size]


def ingest() -> int:
    count = 0
    for fname in sorted(os.listdir(_settings.playbook_dir)):
        path = os.path.join(_settings.playbook_dir, fname)
        if fname.lower().endswith(".pdf"):
            text = "\n".join((p.extract_text() or "") for p in PdfReader(path).pages)
        elif fname.lower().endswith((".md", ".txt")):
            text = open(path, encoding="utf-8", errors="ignore").read()
        else:
            continue
        chunks = [c for c in _chunks(text) if c.strip()]
        if not chunks:
            continue
        ids = [hashlib.sha1(f"{fname}:{i}".encode()).hexdigest() for i in range(len(chunks))]
        _collection.upsert(ids=ids, documents=chunks,
                           embeddings=embed(chunks),
                           metadatas=[{"source": fname}] * len(chunks))
        count += len(chunks)
    return count


def query(question: str, k: int = 6) -> list[dict]:
    if _collection.count() == 0:
        return []
    res = _collection.query(query_embeddings=embed([question]), n_results=min(k, _collection.count()))
    return [
        {"text": doc, "source": meta.get("source", "playbook")}
        for doc, meta in zip(res["documents"][0], res["metadatas"][0])
    ]
