"""Verify retained original bytes only; not gameplay acceptance."""
import hashlib
import json
from pathlib import Path

base = Path(__file__).resolve().parent
rows = json.loads((base / "payload-hashes.json").read_text(encoding="utf-8"))
for row in rows:
    payload = (base / row["path"]).read_bytes()
    assert len(payload) == row["bytes"], row["path"]
    assert hashlib.sha256(payload).hexdigest() == row["sha256"], row["path"]
print(f"PASS: {len(rows)} original payloads; no gameplay acceptance inferred")
