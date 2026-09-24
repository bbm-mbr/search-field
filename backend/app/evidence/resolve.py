"""Turn Gemini's grounding redirect links into the real source URL.

Grounding chunks carry vertexaisearch.cloud.google.com/grounding-api-redirect/…
links, which expire and say nothing about the source. One HEAD request without
following redirects returns the target in the Location header — fast, and the
source site itself is never contacted.
"""
from __future__ import annotations

from typing import Dict, Optional

import httpx

from ..config import get_settings

REDIRECT_HOST = "vertexaisearch.cloud.google.com"


class Resolver:
    """One per research run: caches, and shares a single connection pool."""

    def __init__(self, client: Optional[httpx.Client] = None):
        get_settings()  # proxy into the environment first
        self._c = client or httpx.Client(timeout=httpx.Timeout(15, connect=10), trust_env=True,
                                         follow_redirects=False)
        self._cache: Dict[str, Optional[str]] = {}

    def resolve(self, url: str) -> Optional[str]:
        """The target URL, or None when it cannot be resolved (caller falls
        back to the domain Gemini put in the chunk title)."""
        if not url or REDIRECT_HOST not in url:
            return url
        if url in self._cache:
            return self._cache[url]
        target = None
        for method in ("HEAD", "GET"):
            try:
                r = self._c.request(method, url)
            except httpx.HTTPError:
                break
            loc = r.headers.get("location")
            if r.is_redirect and loc and loc.startswith("http"):
                target = loc
                break
            if r.status_code != 405:      # only retry with GET if HEAD is refused
                break
        self._cache[url] = target
        return target

    def close(self) -> None:
        self._c.close()
