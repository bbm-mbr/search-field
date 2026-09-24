"""Getting JSON out of a model, robustly.

The failed first attempt died here: max_tokens=4000 truncated long answers and
a bare json.loads turned every truncation into a crash. Now:

  1. strip code fences and any prose around the JSON,
  2. parse the first balanced object or array,
  3. if that fails, ONE repair call on the fast tier, then give up loudly.

Callers also check `truncated` on the result they parsed from: a response that
hit its token limit is re-asked with a bigger budget, never repaired, because
repairing a truncated list silently drops its tail.
"""
from __future__ import annotations

import json
import re
from typing import Any, Callable, Optional

FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.S)


class JSONError(ValueError):
    pass


def _balanced(text: str) -> Optional[str]:
    starts = [i for i in (text.find("{"), text.find("[")) if i >= 0]
    if not starts:
        return None
    i = min(starts)
    stack, in_str, esc = [], False, False
    for j in range(i, len(text)):
        ch = text[j]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        elif ch == '"':
            in_str = True
        elif ch in "{[":
            stack.append("}" if ch == "{" else "]")
        elif ch in "}]":
            if not stack or stack.pop() != ch:
                return None
            if not stack:
                return text[i:j + 1]
    return None


def extract(text: str) -> Any:
    candidates = [m.group(1) for m in FENCE.finditer(text or "")] + [text or ""]
    for c in candidates:
        chunk = _balanced(c)
        if chunk is None:
            continue
        try:
            return json.loads(chunk)
        except json.JSONDecodeError:
            continue
    raise JSONError("no parseable JSON in model output")


def parse(text: str, repair: Optional[Callable[[str], str]] = None) -> Any:
    try:
        return extract(text)
    except JSONError:
        if repair is None:
            raise
    fixed = repair(text)
    try:
        return extract(fixed)
    except JSONError as e:
        raise JSONError(f"unparseable after one repair attempt: {(text or '')[:200]!r}") from e


def farm_repair(text: str) -> str:
    """The standard repair: Haiku, asked to return the same content as valid JSON."""
    from .gateway import run
    return run("repair.json", "Return the following as valid JSON only — same content, no commentary, "
               "no code fences. Fix syntax only; do not add, drop or change values.\n\n" + text,
               max_tokens=4096, temperature=0).text
