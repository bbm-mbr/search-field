"""Author a proposal for one search field. Nothing reaches the live board.

    python -m scripts.propose manufacturing
    python -m scripts.propose semis --stages pestel,swot     # re-author only some stages
    python -m scripts.propose manufacturing --resume 1       # continue a failed pass; finished stages are reused
    python -m scripts.propose manufacturing --resume 2 --redo market   # re-run a stage and what depends on it

Review it at http://127.0.0.1:5190/#/review
"""
import argparse
import json
import sys

from app.db import create_all
from app.pipeline import guidance
from app.pipeline.author import FRAMEWORKS, propose


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("field")
    ap.add_argument("--stages", help=f"comma-separated subset of {','.join(FRAMEWORKS)}")
    ap.add_argument("--resume", type=int, help="proposal id to continue; finished stages are reused")
    ap.add_argument("--redo", help="comma-separated stages to re-run when resuming")
    ap.add_argument("--no-revise", action="store_true", help="skip the critic-driven revision round")
    a = ap.parse_args()
    create_all()
    guidance.load_seed()
    stages = a.stages.split(",") if a.stages else None
    s = propose(a.field, stages=stages, resume=a.resume,
                redo=a.redo.split(",") if a.redo else None, revise=not a.no_revise)
    print(json.dumps(s, indent=2, ensure_ascii=False))
    return 0 if s["status"] in ("ready", "blocked") else 1


if __name__ == "__main__":
    sys.exit(main())
