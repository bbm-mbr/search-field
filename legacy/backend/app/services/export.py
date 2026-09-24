"""PPTX export — renders a cached deep-dive result to a PowerPoint deck.

Slide layout:
  1. Title slide — field name, verdict, score, date
  2. Decision matrix table
  3. Recommendation reasoning + next steps
  4. SWOT quadrant (text)
  5. Porter's Five Forces (text)
  6. Market sizing (TAM / SAM / CAGR)
  7. Competency summary
  8. 3 Horizons summary
  9. Sub-field portfolio
"""
import io
from datetime import date
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

# Bosch brand palette
_VIOLET = RGBColor(0x7A, 0x1F, 0xA2)
_RED    = RGBColor(0xE2, 0x00, 0x15)
_TEAL   = RGBColor(0x00, 0x96, 0xA0)
_GREEN  = RGBColor(0x5B, 0xAA, 0x32)
_INK    = RGBColor(0x0E, 0x1A, 0x2E)
_WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
_LIGHT  = RGBColor(0xF7, 0xF8, 0xFA)

VERDICT_COLOR = {
    "ENTER": _GREEN, "EXPLORE": _TEAL, "WATCH": RGBColor(0xD9, 0x77, 0x06), "NO-GO": _RED
}


def _slide_size_wh() -> tuple[Emu, Emu]:
    return Inches(13.33), Inches(7.5)


def _add_slide(prs: Presentation, layout_idx: int = 6):
    return prs.slides.add_slide(prs.slide_layouts[layout_idx])


def _txb(slide, left, top, width, height, text, size=12, bold=False,
         color=_INK, align=PP_ALIGN.LEFT, wrap=True):
    txb = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = txb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return txb


def _rect(slide, left, top, width, height, fill_color):
    from pptx.util import Inches
    shape = slide.shapes.add_shape(
        1,  # MSO_SHAPE_TYPE.RECTANGLE
        Inches(left), Inches(top), Inches(width), Inches(height)
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    return shape


def build_pptx(data: dict) -> bytes:
    field = data.get("field", {})
    rec = data.get("recommendation", {})
    a = data.get("analysis", {})

    prs = Presentation()
    prs.slide_width, prs.slide_height = _slide_size_wh()

    # ── Slide 1: Title ──────────────────────────────────────────────────────
    sl = _add_slide(prs)
    _rect(sl, 0, 0, 13.33, 0.05, _RED)  # 4px top strip
    _rect(sl, 0, 0.05, 13.33, 7.45, _LIGHT)

    verdict = rec.get("verdict", "—")
    score = rec.get("adjusted_score", 0)
    vc = VERDICT_COLOR.get(verdict, _INK)

    _txb(sl, 0.6, 0.4, 10, 0.5, "Bosch Mobility India · BBM Search-Field Intelligence",
         size=11, color=RGBColor(0x88, 0x88, 0x88))
    _txb(sl, 0.6, 0.8, 10, 1.2, field.get("name", ""), size=36, bold=True, color=_INK)
    _txb(sl, 0.6, 2.2, 4, 0.6, f"Verdict: {verdict}  ·  Score: {score:.1f}/10",
         size=22, bold=True, color=vc)
    _txb(sl, 0.6, 3.0, 9, 0.4, f"Confidence: {int((rec.get('confidence', 0))*100)}%  ·  "
         f"Entry mode: {rec.get('entry_mode', '')}",
         size=13, color=_INK)
    _txb(sl, 0.6, 3.5, 9, 1.5, "Key next steps:\n" +
         "\n".join(f"• {s}" for s in (rec.get("next_steps") or [])[:4]),
         size=12, color=_INK)
    _txb(sl, 0.6, 6.9, 4, 0.4, f"Generated {date.today().isoformat()}",
         size=9, color=RGBColor(0xAA, 0xAA, 0xAA))

    # ── Slide 2: Decision matrix ─────────────────────────────────────────────
    sl = _add_slide(prs)
    _rect(sl, 0, 0, 13.33, 0.05, _RED)
    _txb(sl, 0.4, 0.15, 12, 0.5, "Decision Matrix — full working (computed, auditable)",
         size=16, bold=True)

    matrix = rec.get("decision_matrix", {})
    rows = matrix.get("rows", [])
    col_x = [0.4, 4.0, 5.5, 6.7, 8.0, 9.5, 11.2]
    hdrs = ["Criterion", "Wt", "Score", "Conf", "Eff.wt", "Contribution", ""]
    for ci, h in enumerate(hdrs):
        _txb(sl, col_x[ci], 0.75, 1.8, 0.3, h, size=9, bold=True,
             color=RGBColor(0x88, 0x88, 0x88))

    for ri, row in enumerate(rows):
        y = 1.1 + ri * 0.5
        vals = [
            row.get("criterion", ""), str(row.get("weight", "")),
            str(row.get("score", "")), f"{int(row.get('confidence', 0)*100)}%",
            str(row.get("effective_weight", "")), str(row.get("contribution", "")), ""
        ]
        for ci, v in enumerate(vals):
            _txb(sl, col_x[ci], y, 1.8, 0.45, v, size=10)

    y = 1.1 + len(rows) * 0.5 + 0.1
    _txb(sl, 0.4, y, 11, 0.3,
         f"Weighted score: {matrix.get('weighted_score', 0):.2f}  ·  "
         f"Σ eff.weight: {matrix.get('sum_effective_weight', 0):.4f}  ·  "
         f"Confidence: {int(matrix.get('verdict_confidence', 0)*100)}%",
         size=10, bold=True, color=_INK)
    _txb(sl, 0.4, y + 0.4, 12, 0.5,
         matrix.get("formula", ""), size=8, color=RGBColor(0x88, 0x88, 0x88))

    # ── Slide 3: Reasoning & Risks ───────────────────────────────────────────
    sl = _add_slide(prs)
    _rect(sl, 0, 0, 13.33, 0.05, _RED)
    _txb(sl, 0.4, 0.15, 12, 0.5, "Recommendation — Reasoning & Risks", size=16, bold=True)
    reasoning = "\n".join(f"• {r}" for r in (rec.get("reasoning") or []))
    _txb(sl, 0.4, 0.75, 8.5, 4.5, reasoning, size=11)
    risks = "\n".join(f"⚠ {r}" for r in (rec.get("key_risks") or []))
    _txb(sl, 9.2, 0.75, 3.8, 4.5, "Key Risks\n" + risks, size=11, color=_RED)

    # ── Slide 4: SWOT ────────────────────────────────────────────────────────
    swot = a.get("swot", {})
    sl = _add_slide(prs)
    _rect(sl, 0, 0, 13.33, 0.05, _RED)
    _txb(sl, 0.4, 0.15, 12, 0.5, "SWOT Analysis", size=16, bold=True)
    quadrants = [
        ("Strengths", swot.get("strengths", []), _GREEN, 0.4, 0.8),
        ("Weaknesses", swot.get("weaknesses", []), _RED, 6.8, 0.8),
        ("Opportunities", swot.get("opportunities", []), _TEAL, 0.4, 4.2),
        ("Threats", swot.get("threats", []), _VIOLET, 6.8, 4.2),
    ]
    for title, items, col, x, y in quadrants:
        _txb(sl, x, y, 5.8, 0.35, title, size=12, bold=True, color=col)
        body = "\n".join(f"• {it.get('point', '')} — {it.get('so_what', '')}"
                         for it in (items or [])[:3])
        _txb(sl, x, y + 0.35, 5.8, 3.0, body, size=9)

    # ── Slide 5: Porter's Five Forces ────────────────────────────────────────
    porter = a.get("porter", {})
    sl = _add_slide(prs)
    _rect(sl, 0, 0, 13.33, 0.05, _RED)
    _txb(sl, 0.4, 0.15, 12, 0.5, "Porter's Five Forces", size=16, bold=True)
    forces = porter.get("forces", {})
    fx = [0.4, 4.7, 9.0, 0.4, 4.7]
    fy = [0.8, 0.8, 0.8, 3.8, 3.8]
    for i, (fname, fdata) in enumerate(list(forces.items())[:5]):
        intensity = fdata.get("intensity", 0)
        color = _RED if intensity >= 7 else (_VIOLET if intensity >= 5 else _GREEN)
        _txb(sl, fx[i], fy[i], 4.0, 0.3,
             f"{fname.replace('_', ' ').title()}: {intensity}/10",
             size=11, bold=True, color=color)
        _txb(sl, fx[i], fy[i] + 0.3, 4.0, 2.6,
             fdata.get("reasoning", "")[:400], size=9)

    # ── Slide 6: Market Sizing ───────────────────────────────────────────────
    mkt = a.get("market_sizing", {})
    sl = _add_slide(prs)
    _rect(sl, 0, 0, 13.33, 0.05, _RED)
    _txb(sl, 0.4, 0.15, 12, 0.5, "Market Sizing — TAM / SAM (India)", size=16, bold=True)
    tam = mkt.get("tam_usd_m", {})
    sam = mkt.get("sam_usd_m", {})
    cagr = mkt.get("cagr_pct", {})
    summary = (
        f"TAM: ${tam.get('value', 0):.0f}M  ({tam.get('year', '')})\n"
        f"SAM: ${sam.get('value', 0):.0f}M  ({sam.get('year', '')})\n"
        f"CAGR: {cagr.get('value', 0):.1f}%  ({cagr.get('period', '')})\n\n"
        f"TAM basis: {tam.get('basis', '')}\n"
        f"SAM basis: {sam.get('basis', '')}\n\n"
        f"Cross-check: {mkt.get('cross_check', '')}"
    )
    _txb(sl, 0.4, 0.75, 8, 5.5, summary, size=12)
    steps = "\n".join(
        f"• {s.get('step')}: {s.get('value')}"
        for s in (mkt.get("derivation_steps") or [])[:8]
    )
    _txb(sl, 8.5, 0.75, 4.5, 5.5, "Derivation chain:\n" + steps, size=9)

    # ── Slide 7: Competency ──────────────────────────────────────────────────
    comp = a.get("competency", {})
    sl = _add_slide(prs)
    _rect(sl, 0, 0, 13.33, 0.05, _RED)
    _txb(sl, 0.4, 0.15, 12, 0.5, "Competency Analysis — Bosch vs Required", size=16, bold=True)
    for i, r in enumerate((comp.get("required") or [])[:8]):
        y = 0.8 + i * 0.75
        _txb(sl, 0.4, y, 5, 0.3, r.get("competency", ""), size=10, bold=True)
        _txb(sl, 5.5, y, 1.5, 0.3,
             f"Bosch {r.get('bosch_level', 0)} / Req {r.get('required_level', 0)}",
             size=10, color=_TEAL)
        _txb(sl, 7.2, y, 5.8, 0.3,
             r.get("gap_closure_rationale", "")[:120], size=9)

    # ── Slide 8: 3 Horizons ──────────────────────────────────────────────────
    th = a.get("three_horizons", {})
    sl = _add_slide(prs)
    _rect(sl, 0, 0, 13.33, 0.05, _RED)
    _txb(sl, 0.4, 0.15, 12, 0.5, "McKinsey 3 Horizons — Technology Growth", size=16, bold=True)
    horizons = [
        ("H1 · Core now", th.get("h1_core_now", []), _GREEN, 0.4),
        ("H2 · 2-5 years", th.get("h2_emerging_2_5y", []), _TEAL, 4.5),
        ("H3 · 5+ years", th.get("h3_future_5y_plus", []), _VIOLET, 8.6),
    ]
    for title, items, col, x in horizons:
        _txb(sl, x, 0.75, 3.8, 0.35, title, size=12, bold=True, color=col)
        body = "\n".join(
            f"• {it.get('item', '')}" for it in (items or [])[:5]
        )
        _txb(sl, x, 1.1, 3.8, 5.5, body, size=10)

    # ── Slide 9: Sub-field portfolio ─────────────────────────────────────────
    portfolio = rec.get("subfield_portfolio") or []
    if portfolio:
        sl = _add_slide(prs)
        _rect(sl, 0, 0, 13.33, 0.05, _RED)
        _txb(sl, 0.4, 0.15, 12, 0.5, "Where to Play — Sub-field Portfolio", size=16, bold=True)
        cols = 3
        w = 12.0 / cols
        for i, p in enumerate(portfolio[:9]):
            col_i = i % cols
            row_i = i // cols
            x = 0.4 + col_i * (w + 0.1)
            y = 0.85 + row_i * 2.0
            play = p.get("play", "")
            pc = {"lead": _GREEN, "partner": _TEAL, "watch": _VIOLET, "skip": _RED}.get(play, _INK)
            _txb(sl, x, y, w, 0.3, p.get("sub_field", ""), size=11, bold=True)
            _txb(sl, x, y + 0.3, 1.2, 0.3, play.upper(), size=10, bold=True, color=pc)
            _txb(sl, x, y + 0.65, w, 1.1, p.get("why", "")[:200], size=9)

    buf = io.BytesIO()
    prs.save(buf)
    return buf.getvalue()
