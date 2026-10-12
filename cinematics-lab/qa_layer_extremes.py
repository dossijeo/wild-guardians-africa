"""Render before/after parallax positions for visual gap and halo review."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw
from render_motion_preview import render as render_scene


ROOT = Path(__file__).parent


def render(scene_id: str, pan_fraction: float) -> Image.Image:
    manifest = json.loads((ROOT / "cinematics-manifest.json").read_text(encoding="utf-8"))
    scene = next(s for a in manifest["acts"] for s in a["scenes"] if s["id"] == scene_id)
    return render_scene(scene, pan_fraction)


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
