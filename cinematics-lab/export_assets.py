"""Export selected generated PNGs as compact, offline WebP illustrations."""

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-dir", type=Path, required=True)
    ap.add_argument("--mapping", type=Path, default=Path(__file__).with_name("generated-sources.local.json"))
    ap.add_argument("--quality", type=int, default=78)
    ap.add_argument("--preserve-png", action="store_true")
    args = ap.parse_args()
    mapping = json.loads(args.mapping.read_text(encoding="utf-8"))
    output = Path(__file__).with_name("assets")
    output.mkdir(exist_ok=True)
    sources = Path(__file__).with_name("sources")
    if args.preserve_png:
        sources.mkdir(exist_ok=True)
    provenance = {}
    total_before = total_after = 0
    for scene_id, filename in sorted(mapping.items()):
        source = args.source_dir / filename
        if not source.is_file():
            raise FileNotFoundError(source)
        target = output / f"scene-{scene_id}.webp"
        if args.preserve_png:
            shutil.copyfile(source, sources / f"scene-{scene_id}.png")
        provenance[scene_id] = {"generatorFile": filename, "pngSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "pngBytes": source.stat().st_size}
        with Image.open(source) as image:
            if image.size[0] / image.size[1] < 1.7 or image.size[0] / image.size[1] > 1.85:
                raise ValueError(f"Unexpected aspect ratio: {source}")
            image.convert("RGB").save(target, "WEBP", quality=args.quality, method=6)
        total_before += source.stat().st_size
        total_after += target.stat().st_size
    print(f"Exported {len(mapping)} scenes; PNG {total_before:,} B -> WebP {total_after:,} B")
    if args.preserve_png:
        (sources / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
