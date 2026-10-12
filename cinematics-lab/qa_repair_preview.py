"""Reproduce seven before/after contacts from approved baseline and final WebP."""

import argparse
import io
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).parent
SIZE = (1672, 941)
BASELINE = "c6ee2d78"
CACHE = {}


def baseline_bytes(path: str) -> bytes:
    return subprocess.check_output(["git", "show", f"{BASELINE}:cinematics-lab/{path}"], cwd=ROOT)


def transformed(source: Image.Image, motion: dict, fraction: float) -> Image.Image:
    x = motion["startXPercent"] + fraction * (motion["endXPercent"] - motion["startXPercent"])
    y = motion["startYPercent"] + fraction * (motion["endYPercent"] - motion["startYPercent"])
    scale = motion["startScale"] + fraction * (motion["endScale"] - motion["startScale"])
    resized = source.convert("RGBA").resize((round(SIZE[0] * scale), round(SIZE[1] * scale)), Image.Resampling.LANCZOS)
    left = round((SIZE[0] - resized.width) / 2 + SIZE[0] * x / 100)
    top = round((SIZE[1] - resized.height) / 2 + SIZE[1] * y / 100)
    plate = Image.new("RGBA", SIZE)
    plate.paste(resized, (left, top))
    return plate


def render(scene: dict, fraction: float, baseline: bool, source_png: bool = False) -> Image.Image:
    image = Image.new("RGBA", SIZE)
    for layer in scene["layers"]:
        path = layer["image"]
        if source_png and not baseline:
            path = str(Path(path).with_suffix(".png"))
        key = (path, baseline)
        if key not in CACHE:
            data = baseline_bytes(path) if baseline else (ROOT / path).read_bytes()
            with Image.open(io.BytesIO(data)) as asset:
                CACHE[key] = asset.convert("RGBA")
        image.alpha_composite(transformed(CACHE[key], layer["motion"], fraction))
    assert image.getchannel("A").getextrema() == (255, 255)
    return image.convert("RGB")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("scenes", nargs="+")
    parser.add_argument("--source-png", action="store_true", help="Preview edited PNG before its Tinify conversion")
    args = parser.parse_args()
    current = json.loads((ROOT / "cinematics-manifest.json").read_text(encoding="utf-8"))
    original = json.loads(baseline_bytes("cinematics-manifest.json"))
    before = {s["id"]: s for act in original["acts"] for s in act["scenes"]}
    after = {s["id"]: s for act in current["acts"] for s in act["scenes"]}
    (ROOT / "qa-fixes").mkdir(exist_ok=True)
    for scene_id in args.scenes:
        sheet = Image.new("RGB", (1740, 716), "#efe4d0")
        draw = ImageDraw.Draw(sheet)
        for row, name, scene, is_before in ((0, "antes", before[scene_id], True), (1, "después", after[scene_id], False)):
            for col, (fraction, position) in enumerate(((0, "inicio"), (0.5, "mitad"), (1, "final"))):
                frame = render(scene, fraction, is_before, args.source_png).resize((570, 321), Image.Resampling.LANCZOS)
                x, y = col * 580, row * 358
                sheet.paste(frame, (x, y))
                draw.text((x + 4, y + 324), f"{scene_id} · {name} · {position}", fill="#211b16")
        out = ROOT / "qa-fixes" / f"compare-scene-{scene_id}.jpg"
        sheet.save(out, quality=88)
        print(out)


if __name__ == "__main__":
    main()
