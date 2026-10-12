"""Copy selected imagegen edits into stable, auditable layer source names."""

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).parent


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-dir", type=Path, required=True)
    args = ap.parse_args()
    layer_dir = ROOT / "layers"
    mapping = json.loads((layer_dir / "generated-sources.local.json").read_text(encoding="utf-8"))
    provenance_path = layer_dir / "provenance.json"
    report = json.loads(provenance_path.read_text(encoding="utf-8")) if provenance_path.exists() else {}
    for scene_id, parts in sorted(mapping.items()):
        report.setdefault(scene_id, {})
        for role, filename in parts.items():
            source = args.source_dir / filename
            target = layer_dir / f"scene-{scene_id}-{role}.png"
            if not source.is_file():
                previous = report[scene_id].get(role)
                if not target.is_file() or not previous or hashlib.sha256(target.read_bytes()).hexdigest() != previous["sha256"]:
                    raise FileNotFoundError(source)
                with Image.open(target) as image:
                    if image.size[0] == 1671:
                        padded = Image.new(image.mode, (1672, 941), (0, 0, 0, 0) if image.mode == "RGBA" else (0, 0, 0))
                        padded.paste(image, (0, 0))
                        if role == "background":
                            padded.paste(image.crop((1670, 0, 1671, 941)), (1671, 0))
                        padded.save(target, "PNG")
                        previous["generatorSha256"] = previous["sha256"]
                        previous["sha256"] = hashlib.sha256(target.read_bytes()).hexdigest()
                        previous["bytes"] = target.stat().st_size
                continue
            generator_sha = hashlib.sha256(source.read_bytes()).hexdigest()
            with Image.open(source) as image:
                image.load()
                if image.size[0] not in (1671, 1672) or image.size[1] != 941:
                    raise ValueError(f"Invalid layer size: {filename}")
                if role == "foreground" and "A" not in image.getbands():
                    raise ValueError(f"Missing alpha in {filename}")
                mode = image.mode
                if image.size[0] == 1671:
                    padded = Image.new(image.mode, (1672, 941), (0, 0, 0, 0) if mode == "RGBA" else (0, 0, 0))
                    padded.paste(image, (0, 0))
                    if role == "background":
                        padded.paste(image.crop((1670, 0, 1671, 941)), (1671, 0))
                    padded.save(target, "PNG")
                else:
                    shutil.copyfile(source, target)
            report[scene_id][role] = {"generatorFile": filename, "generatorSha256": generator_sha, "sha256": hashlib.sha256(target.read_bytes()).hexdigest(), "bytes": target.stat().st_size, "mode": mode}
    provenance_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Registered {len(mapping)} two-layer scenes")


if __name__ == "__main__":
    main()
