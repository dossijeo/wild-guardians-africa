"""Contact sheets for the seven targeted layer repairs."""

import argparse
import io
import json
from pathlib import Path

from PIL import Image, ImageDraw

from qa_repair_preview import baseline_bytes, render


ROOT = Path(__file__).parent
OUT = ROOT / "qa-fixes"
SIZE = (570, 321)
IDS = ("19", "31", "33", "35", "38", "41", "47")


def fit(image: Image.Image) -> Image.Image:
    if image.mode == "RGBA":
        base = Image.new("RGBA", image.size, "white")
        base.alpha_composite(image)
        image = base
    return image.convert("RGB").resize(SIZE, Image.Resampling.LANCZOS)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=("before", "after"))
    args = parser.parse_args()
    baseline = args.phase == "before"
    data = json.loads(baseline_bytes("cinematics-manifest.json") if baseline else (ROOT / "cinematics-manifest.json").read_bytes())
    by_id = {s["id"]: s for a in data["acts"] for s in a["scenes"]}
    OUT.mkdir(exist_ok=True)
    for scene_id in IDS:
        scene = by_id[scene_id]
        def asset(path: str) -> Image.Image:
            return Image.open(io.BytesIO(baseline_bytes(path))) if baseline else Image.open(ROOT / path)

        panels = [
            (fit(asset(scene["image"])), "cuadro original"),
            (fit(asset(scene["layers"][0]["image"])), "fondo reconstruido"),
            (fit(asset(scene["layers"][-1]["image"])), "recorte alfa sobre blanco"),
        ]
        for fraction, label in ((0, "inicio"), (0.5, "mitad"), (1, "final")):
            panels.append((fit(render(scene, fraction, baseline)), f"compuesto {label}"))
        sheet = Image.new("RGB", (1740, 716), "#efe4d0")
        draw = ImageDraw.Draw(sheet)
        for n, (panel, title) in enumerate(panels):
            x, y = (n % 3) * 580, (n // 3) * 358
            sheet.paste(panel, (x, y))
            draw.text((x + 5, y + 325), f"{scene_id} · {title}", fill="#1b1611")
        target = OUT / f"{args.phase}-scene-{scene_id}.jpg"
        sheet.save(target, quality=88)
        print(target)


if __name__ == "__main__":
    main()
