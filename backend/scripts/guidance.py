"""Load standing guidance (rules, charters, reviewer notes) from seed/guidance.json.

    python -m scripts.guidance            # load / update, then list
    python -m scripts.guidance manufacturing
"""
import sys

from app.db import create_all
from app.pipeline import guidance


def main() -> int:
    create_all()
    print(guidance.load_seed())
    ent = sys.argv[1] if len(sys.argv) > 1 else None
    if ent:
        for g in guidance.for_entity(ent):
            print(f"  G{g['id']:<3} {g['kind']:8} {g['stage'] or 'all':11} {g['text'][:110]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
