"""Free only verified duplicate imagegen outputs from this laboratory.

Requires --execute. Sources in this repo remain intact; no recursive deletion.
"""

import argparse
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).parent
EXPECTED_DIR_NAME = "01a12f63-12a8-7672-a495-737875c79b92"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-dir", type=Path, required=True)
    ap.add_argument("--execute", action="store_true")
    args = ap.parse_args()
    generated = args.source_dir.resolve(strict=True)
    if generated.name != EXPECTED_DIR_NAME or generated.parent.name != "generated_images" or generated.is_symlink():
        raise SystemExit("Refusing: unexpected generated-images directory")
    files = []
    base = json.loads((ROOT / "sources" / "provenance.json").read_text(encoding="utf-8"))
    for scene_id, entry in base.items():
        files.append((entry["generatorFile"], ROOT / "sources" / f"scene-{scene_id}.png", entry["pngSha256"]))
    layers = json.loads((ROOT / "layers" / "provenance.json").read_text(encoding="utf-8"))
    for scene_id, parts in layers.items():
        for role, entry in parts.items():
            files.append((entry["generatorFile"], ROOT / "layers" / f"scene-{scene_id}-{role}.png", entry["sha256"], entry.get("generatorSha256", entry["sha256"])))
    verified = []
    for row in files:
        filename, saved, expected_sha = row[:3]
        generated_sha = row[3] if len(row) > 3 else expected_sha
        if not re.fullmatch(r"exec-[0-9a-f-]{36}\.png", filename):
            raise SystemExit(f"Refusing: invalid filename {filename}")
        original = generated / filename
        if not saved.is_file() or digest(saved) != expected_sha:
            raise SystemExit(f"Refusing: saved copy unverified: {saved.name}")
        if original.exists():
            if original.resolve().parent != generated or digest(original) != generated_sha:
                raise SystemExit(f"Refusing: original differs: {filename}")
            verified.append(original)
    bytes_total = sum(p.stat().st_size for p in verified)
    print(f"Verified duplicate outputs: {len(verified)} files, {bytes_total:,} bytes")
    if args.execute:
        for path in verified:
            path.unlink()
        print(f"Removed verified duplicates: {len(verified)}")


if __name__ == "__main__":
    main()
