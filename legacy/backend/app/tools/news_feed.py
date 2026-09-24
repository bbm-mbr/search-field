"""Recent-activity feed for a search field — entirely free sources.

- Google News RSS (no key, query-able, fresh)
- GDELT 2.0 DOC API (no key, global news graph, supports date ranges)

Used by the "Recent Activity" tab and to ground time-sensitive claims.
"""
import urllib.parse
import httpx
import feedparser


def google_news(query: str, max_items: int = 10, region: str = "IN") -> list[dict]:
    q = urllib.parse.quote(f"{query} India mobility")
    url = f"https://news.google.com/rss/search?q={q}&hl=en-IN&gl={region}&ceid={region}:en"
    feed = feedparser.parse(url)
    return [{
        "title": e.title,
        "url": e.link,
        "published": getattr(e, "published", ""),
        "source": getattr(getattr(e, "source", None), "title", "Google News"),
    } for e in feed.entries[:max_items]]


def gdelt(query: str, max_items: int = 10) -> list[dict]:
    r = httpx.get("https://api.gdeltproject.org/api/v2/doc/doc",
                  params={"query": f"{query} india", "mode": "ArtList",
                          "maxrecords": max_items, "format": "json", "sort": "DateDesc"},
                  timeout=20)
    r.raise_for_status()
    arts = r.json().get("articles", [])
    return [{"title": a.get("title", ""), "url": a.get("url", ""),
             "published": a.get("seendate", ""), "source": a.get("domain", "GDELT")}
            for a in arts]


def recent_activity(field_name: str, sub_field: str | None = None, max_items: int = 12) -> list[dict]:
    query = f"{field_name} {sub_field or ''}".strip()
    items = google_news(query, max_items)
    if len(items) < 5:
        items += gdelt(query, max_items - len(items))
    seen, out = set(), []
    for it in items:
        if it["url"] not in seen:
            seen.add(it["url"])
            out.append(it)
    return out[:max_items]
