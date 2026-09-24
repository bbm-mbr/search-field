"""Load backend/seed/board.json into the database.

    python -m scripts.seed

Replaces the database content with the seed. Run it once after extraction and
again whenever tools/extract.cjs is re-run against a newer static board.
"""
import json
import sys

from app.config import get_settings
from app.db import create_all
from app.repository import assemble_board, seed_from_board


def main() -> int:
    s = get_settings()
    board = json.loads((s.seed_dir / "board.json").read_text(encoding="utf-8"))
    create_all()
    counts = seed_from_board(board)
    back = assemble_board()
    same = json.dumps(back, ensure_ascii=False) == json.dumps(board, ensure_ascii=False)
    print(f"seeded {counts['entities']} entities, {counts['sections']} sections into {s.database_url.split('://')[0]}")
    print("round-trip: IDENTICAL" if same else "round-trip: MISMATCH")
    return 0 if same else 1


if __name__ == "__main__":
    sys.exit(main())
