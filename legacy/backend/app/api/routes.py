from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import json
from pathlib import Path
from ..agents.orchestrator import deep_dive, get_field, _FIELDS, _CRITERIA, _cache_path
from ..tools.news_feed import recent_activity
from ..rag.playbook_store import ingest

router = APIRouter(prefix="/api")


@router.get("/fields")
def list_fields():
    return {"search_fields": _FIELDS, "criteria": _CRITERIA}


@router.post("/deep-dive/{field_id}")
async def field_deep_dive(field_id: str, rollup: bool = True):
    """Full search-field analysis: all frameworks + sub-field roll-up + verdict."""
    return await deep_dive(field_id, include_rollup=rollup)


@router.post("/deep-dive/{field_id}/{sub_field_id}")
async def subfield_deep_dive(field_id: str, sub_field_id: str):
    return await deep_dive(field_id, sub_field_id, include_rollup=False)


@router.get("/recent-activity/{field_id}")
def activity(field_id: str, sub: str | None = None):
    field = next((f for f in _FIELDS if f["id"] == field_id), None)
    if not field:
        raise HTTPException(status_code=404, detail="field not found")
    return {"items": recent_activity(field["name"], sub)}


@router.post("/playbook/ingest")
def ingest_playbook():
    return {"chunks_indexed": ingest()}


@router.get("/export/{field_id}")
def export_pptx(field_id: str, sub: str | None = None):
    """Return the most-recent cached analysis for field_id as a PPTX file."""
    from ..services.export import build_pptx

    cache_p = _cache_path(field_id, sub)
    if not cache_p.exists():
        raise HTTPException(
            status_code=404,
            detail="No cached analysis found for today. Run a deep-dive first.",
        )
    data = json.loads(cache_p.read_text(encoding="utf-8"))
    pptx_bytes = build_pptx(data)
    field = get_field(field_id)
    filename = f"{field['name'].replace(' ', '_')}_{field_id}.pptx"
    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/cache/{field_id}")
def clear_cache(field_id: str, sub: str | None = None):
    """Delete today's cached analysis so the next deep-dive re-runs the agents."""
    cache_p = _cache_path(field_id, sub)
    if cache_p.exists():
        cache_p.unlink()
        return {"deleted": True}
    return {"deleted": False}
