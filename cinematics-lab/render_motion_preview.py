"""Make offline preview GIFs and start/mid/end contact sheets from source layers."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).parent
SIZE = (1672, 941)


def render(scene: dict, fraction: float) -> Image.Image:
    composite = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    for layer in scene["layers"]:
        motion = layer["motion"]
        x = motion["startXPercent"] + fraction * (motion["endXPercent"] - motion["startXPercent"])
        y = motion["startYPercent"] + fraction * (motion["endYPercent"] - motion["startYPercent"])
        scale = motion["startScale"] + fraction * (motion["endScale"] - motion["startScale"])
        source = Image.open(ROOT / layer["image"]).convert("RGBA")
        resized = source.resize((round(SIZE[0] * scale), round(SIZE[1] * scale)), Image.Resampling.LANCZOS)
        left = round((SIZE[0] - resized.width) / 2 + SIZE[0] * x / 100)
        top = round((SIZE[1] - resized.height) / 2 + SIZE[1] * y / 100)
        plate = Image.new("RGBA", SIZE, (0, 0, 0, 0))
        plate.paste(resized, (left, top))
        composite.alpha_composite(plate)
    if composite.getchannel("A").getextrema() != (255, 255):
        raise AssertionError(f"Exposed edge: {scene['id']} at {fraction}")
    return composite.convert("RGB")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("scenes", nargs="+", help="Two-digit scene IDs")
    args = parser.parse_args()
    manifest = json.loads((ROOT / "cinematics-manifest.json").read_text(encoding="utf-8"))
    by_id = {s["id"]: s for act in manifest["acts"] for s in act["scenes"]}
    for scene_id in args.scenes:
        scene = by_id[scene_id]
        frames = [render(scene, n / 27).resize((836, 470), Image.Resampling.LANCZOS) for n in range(28)]
        gif = ROOT / f"preview-parallax-scene-{scene_id}.gif"
        seconds = max(10, scene["audio"]["ES"]["durationSeconds"] + 0.8)
        total_centiseconds = round(seconds * 100)
        base, extra = divmod(total_centiseconds - 1, 27)
        durations = [(base + (n < extra)) * 10 for n in range(27)] + [10]
        frames[0].save(gif, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True)
        sheet = Image.new("RGB", (900, 215), "#f0e4d0")
        draw = ImageDraw.Draw(sheet)
        for col, (fraction, label) in enumerate(((0, "inicio"), (0.5, "medio"), (1, "extremo"))):
            frame = render(scene, fraction).resize((290, 163), Image.Resampling.LANCZOS)
            sheet.paste(frame, (col * 300, 18))
            draw.text((col * 300 + 4, 185), f"{scene_id} / {label}", fill="#211b16")
        contact = ROOT / f"contact-parallax-scene-{scene_id}-three-positions.jpg"
        sheet.save(contact, quality=87)
        print(f"{scene_id}: {gif.name} ({gif.stat().st_size:,} B; {seconds:.2f}s scene), {contact.name}")


if __name__ == "__main__":
    main()
