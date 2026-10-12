"""Check all camera distances and source-edge coverage at both motion extremes."""

import json
from pathlib import Path

from qa_layer_extremes import render


ROOT = Path(__file__).parent


def main() -> None:
    manifest = json.loads((ROOT / "cinematics-manifest.json").read_text(encoding="utf-8"))
    scenes = [s for act in manifest["acts"] for s in act["scenes"]]
    background_pixels = []
    foreground_pixels = []
    for scene in scenes:
        pan = abs(scene["camera"]["panXPercent"])
        bg = 1672 * pan * 2.5 / 100
        front = scene["layers"][-1]
        fg = 1672 * pan * (2.5 + 5.5 * front["depth"]) / 100
        background_pixels.append(bg)
        foreground_pixels.append(fg)
        assert bg > 10 and fg > bg * 1.5
        for at in (0, 1):
            zoom = 1.08 if at == 0 else 1.08 + scene["camera"]["zoom"] - 1
            x_offset = pan * 2.5 / 2
            y_offset = abs(scene["camera"]["panYPercent"]) * 2.5 / 2
            assert (zoom - 1) * 50 > max(x_offset, y_offset), f"Background edge exposed in {scene['id']}"
            render(scene["id"], at)
    print(f"PASS: {len(scenes)*2} full-resolution composites cover every edge")
    print(f"Background horizontal travel: {min(background_pixels):.1f}–{max(background_pixels):.1f} px")
    print(f"Focal foreground horizontal travel: {min(foreground_pixels):.1f}–{max(foreground_pixels):.1f} px")


if __name__ == "__main__":
    main()
