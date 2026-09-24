"""Free, corporate-friendly web search with provider fallback.

Priority order:
1. Self-hosted SearXNG  - best for corporates: runs inside your network,
   aggregates Google/Bing/DDG, no per-query cost, no data leaves the proxy.
2. DuckDuckGo (ddgs)    - zero key, zero cost; good default for dev.
3. Brave Search API     - free tier 2,000 q/month, privacy-first ToS.
4. Tavily               - free tier 1,000 credits/month, LLM-optimised output.

Every result carries url + title + snippet so the agents can cite sources.
"""
import httpx
from ..config import get_settings

_settings = get_settings()


def search(query: str, max_results: int = 8, recency_days: int | None = None) -> list[dict]:
    if _settings.searxng_base_url:
        try:
            return _searxng(query, max_results)
        except Exception:
            pass
    try:
        return _duckduckgo(query, max_results, recency_days)
    except Exception:
        pass
    if _settings.brave_api_key:
        try:
            return _brave(query, max_results)
        except Exception:
            pass
    return []


def _searxng(query: str, n: int) -> list[dict]:
    r = httpx.get(f"{_settings.searxng_base_url}/search",
                  params={"q": query, "format": "json"}, timeout=20)
    r.raise_for_status()
    return [{"title": x["title"], "url": x["url"], "snippet": x.get("content", "")}
            for x in r.json().get("results", [])[:n]]


def _duckduckgo(query: str, n: int, recency_days: int | None) -> list[dict]:
    from ddgs import DDGS
    timelimit = None
    if recency_days:
        timelimit = "d" if recency_days <= 1 else "w" if recency_days <= 7 else "m" if recency_days <= 31 else "y"
    with DDGS() as ddgs:
        rows = ddgs.text(query, max_results=n, timelimit=timelimit)
    return [{"title": r["title"], "url": r["href"], "snippet": r["body"]} for r in rows]


def _brave(query: str, n: int) -> list[dict]:
    r = httpx.get("https://api.search.brave.com/res/v1/web/search",
                  params={"q": query, "count": n},
                  headers={"X-Subscription-Token": _settings.brave_api_key}, timeout=20)
    r.raise_for_status()
    return [{"title": x["title"], "url": x["url"], "snippet": x.get("description", "")}
            for x in r.json().get("web", {}).get("results", [])[:n]]
