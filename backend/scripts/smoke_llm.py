"""Connectivity smoke test for every model the routing policy uses.

    python -m scripts.smoke_llm

One tiny prompt per model through the corporate proxy, plus one grounded call
on each web-search-capable model. Costs a few cents. Tells you which parts of
the model policy will actually work before any pipeline depends on them.
"""
import sys

from app.llm.gateway import call
from app.llm.routing import (EMBED_3_SMALL, GEMINI_25_PRO, GEMINI_37_FLASH, GPT_54, GPT_55,
                             HAIKU_45, OPUS_5, SONNET_46, SONNET_5)

PLAIN = [(OPUS_5, "premium"), (SONNET_5, "standard"), (SONNET_46, "standard fallback"),
         (HAIKU_45, "fast"), (GPT_55, "second opinion"), (GPT_54, "fast fallback"),
         (GEMINI_37_FLASH, "grounded"), (GEMINI_25_PRO, "grounded escalation"), (EMBED_3_SMALL, "embeddings")]
GROUNDED = [GEMINI_37_FLASH, GEMINI_25_PRO, HAIKU_45]

Q_PLAIN = "Reply with exactly the word READY."
Q_GROUNDED = ("In one sentence: what is the most recent notified effective date for India's "
              "BNCAP 2.0 (AIS-197 Rev 1) crash-rating protocol? Cite the source.")


def main() -> int:
    ok = fail = 0
    print(f"{'model':42} {'role':20} {'result':8} {'secs':>5}  detail")
    for m, role in PLAIN:
        try:
            r = call(m, Q_PLAIN, max_tokens=64, temperature=None if m.family == "openai" else 0)
            print(f"{m.id:42} {role:20} {'OK':8} {r.latency_s:5.1f}  {r.text.strip()[:40]!r} in/out {r.input_tokens}/{r.output_tokens}")
            ok += 1
        except Exception as e:
            print(f"{m.id:42} {role:20} {'FAIL':8} {'':>5}  {str(e)[:120]}")
            fail += 1
    print("\ngrounded (live web search):")
    for m in GROUNDED:
        try:
            r = call(m, Q_GROUNDED, max_tokens=700, temperature=None, web_search=True)
            src = (r.citations[0].get("url") or "")[:70] if r.citations else "no citations returned"
            print(f"{m.id:42} {'OK':8} {r.latency_s:5.1f}s  searches={r.searches} citations={len(r.citations)}  {src}")
            print(f"{'':42} {r.text.strip()[:160]!r}")
            ok += 1
        except Exception as e:
            print(f"{m.id:42} {'FAIL':8} {str(e)[:140]}")
            fail += 1
    print(f"\n{ok} passed, {fail} failed")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
