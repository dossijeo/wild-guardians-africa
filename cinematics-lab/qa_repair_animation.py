"""Small offline GIFs for the seven repaired parallax scenes at voice pace."""

import json
from pathlib import Path

from PIL import Image

from render_motion_preview import render


ROOT = Path(__file__).parent
IDS = ("19", "31", "33", "35", "38", "41", "47")
FRAMES = 18


def main() -> None:
    manifest = json.loads((ROOT / "cinematics-manifest.json").read_text(encoding="utf-8"))
    scenes = {s["id"]: s for act in manifest["acts"] for s in act["scenes"]}
    output = ROOT / "qa-fixes"
    output.mkdir(exist_ok=True)
    for scene_id in IDS:
        scene = scenes[scene_id]
        seconds = max(10, scene["audio"]["ES"]["durationSeconds"] + 0.8)
        frames = [render(scene, i / (FRAMES - 1)).resize((500, 281), Image.Resampling.LANCZOS) for i in range(FRAMES)]
        frame_ms = round(seconds * 1000 / (FRAMES - 1) / 10) * 10
        durations = [frame_ms] * (FRAMES - 1) + [100]
        target = output / f"preview-scene-{scene_id}.gif"
        frames[0].save(target, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True)
        print(f"{scene_id}: {target.stat().st_size:,} B; {seconds:.2f}s voice-paced traversal")


if __name__ == "__main__":
    main()
