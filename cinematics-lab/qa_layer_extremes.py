"""Render before/after parallax positions for visual gap and halo review."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).parent


def render(scene_id: str, pan_fraction: float) -> Image.Image:
    manifest = json.loads((ROOT / "cinematics-manifest.json").read_text(encoding="utf-8"))
    scene = next(s for a in manifest["acts"] for s in a["scenes"] if s["id"] == scene_id)
    size = (1672, 941)
    composite = Image.new("RGBA", size, (0, 0, 0, 0))
    for layer in scene["layers"]:
        source = Image.open(ROOT / layer["image"].replace(".webp", ".png")).convert("RGBA")
        assert source.size == size
        depth = layer["depth"]
        factor = 2.5 + 5.5 * depth
        x = scene["camera"]["panXPercent"] * factor
        y = scene["camera"]["panYPercent"] * factor
        offset_x = -x / 2 if pan_fraction == 0 else x / 2
        offset_y = -y / 2 if pan_fraction == 0 else y / 2
        zoom = 1.08 if pan_fraction == 0 else 1.08 + (scene["camera"]["zoom"] - 1) * (1 + depth * 0.35)
        resized = source.resize((round(size[0] * zoom), round(size[1] * zoom)), Image.Resampling.LANCZOS)
        left = round((size[0] - resized.width) / 2 + size[0] * offset_x / 100)
        top = round((size[1] - resized.height) / 2 + size[1] * offset_y / 100)
        plate = Image.new("RGBA", size, (0, 0, 0, 0))
        plate.paste(resized, (left, top))
        composite.alpha_composite(plate)
    assert composite.getchannel("A").getextrema() == (255, 255), f"Uncovered edge in scene {scene_id}"
    return composite.convert("RGB")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("scenes", nargs="+", help="Two-digit scene IDs")
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    sheet = Image.new("RGB", (900, 290 * len(args.scenes)), "white")
    draw = ImageDraw.Draw(sheet)
    for row, scene_id in enumerate(args.scenes):
        for col, point in enumerate((0, 1)):
            image = render(scene_id, point).resize((440, 248))
            sheet.paste(image, (col * 450, row * 290))
            draw.text((col * 450 + 4, row * 290 + 252), f"{scene_id} / {'inicio' if col == 0 else 'extremo'}", fill="black")
    sheet.save(args.out, quality=80)


if __name__ == "__main__":
    main()
