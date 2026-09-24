"""
Standalone diagnostic — run from the backend directory:
    python diag.py

Tests the farm with the exact same format our client uses.
Shows the full response body so you can see the farm's error message.
"""
import json, os, sys
from pathlib import Path
from dotenv import load_dotenv
import httpx

load_dotenv(Path(__file__).parent / ".env")

API_KEY  = os.environ["MODEL_FARM_API_KEY"]
BASE     = os.environ["MODEL_FARM_BASE_URL"]
MODEL    = os.environ.get("ANALYSIS_MODEL", "claude-sonnet-4-6")

URL = f"{BASE}/api/google/v1/publishers/anthropic/models/{MODEL}:rawPredict"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

print("=" * 60)
print(f"Testing: {URL}")
print("=" * 60)

# --- Test 1: Minimal probe (exactly like the working test script) ---
print("\n[TEST 1] Minimal probe — no system, no temperature")
payload1 = {
    "anthropic_version": "vertex-2023-10-16",
    "max_tokens": 64,
    "messages": [{"role": "user", "content": "Say HELLO in one word."}],
}
r = httpx.post(URL, headers=HEADERS, json=payload1, timeout=30)
print(f"  Status: {r.status_code}")
print(f"  Body:   {r.text[:500]}")

# --- Test 2: With system field (our client format) ---
print("\n[TEST 2] With top-level system field")
payload2 = {
    "anthropic_version": "vertex-2023-10-16",
    "max_tokens": 64,
    "system": "You are a helpful assistant.",
    "messages": [{"role": "user", "content": "Say HELLO in one word."}],
}
r = httpx.post(URL, headers=HEADERS, json=payload2, timeout=30)
print(f"  Status: {r.status_code}")
print(f"  Body:   {r.text[:500]}")

# --- Test 3: With system + temperature ---
print("\n[TEST 3] With system + temperature=0.2")
payload3 = {
    "anthropic_version": "vertex-2023-10-16",
    "max_tokens": 64,
    "system": "You are a helpful assistant.",
    "messages": [{"role": "user", "content": "Say HELLO in one word."}],
    "temperature": 0.2,
}
r = httpx.post(URL, headers=HEADERS, json=payload3, timeout=30)
print(f"  Status: {r.status_code}")
print(f"  Body:   {r.text[:500]}")

# --- Test 4: JSON mode (our actual framework call shape) ---
print("\n[TEST 4] JSON mode — what framework agents send")
payload4 = {
    "anthropic_version": "vertex-2023-10-16",
    "max_tokens": 256,
    "system": (
        "You are an analyst. "
        "IMPORTANT: Your ENTIRE response must be a single valid JSON object. "
        "No markdown fences, no explanation outside the JSON object."
    ),
    "messages": [
        {
            "role": "user",
            "content": 'Return this JSON: {"result": "ok", "score": 7, "confidence": 0.8}',
        }
    ],
    "temperature": 0.1,
}
r = httpx.post(URL, headers=HEADERS, json=payload4, timeout=30)
print(f"  Status: {r.status_code}")
print(f"  Body:   {r.text[:500]}")

print("\n" + "=" * 60)
print("Done. If any test shows status 200, that format works.")
print("=" * 60)
