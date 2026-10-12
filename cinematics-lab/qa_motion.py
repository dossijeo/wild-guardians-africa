"""Verify all fifty planned camera tracks and source composites.

This is a deterministic source-image check, not browser playback acceptance.
"""

import json
from pathlib import Path

from render_motion_preview import render


ROOT = Path(__file__).parent
WIDTH = 1672


def travel(layer: dict) -> float:
    motion = layer["motion"]
    return WIDTH * (motion["endXPercent"] - motion["startXPercent"]) / 100


def main() -> None:
    manifest = json.loads((ROOT / "cinematics-manifest.json").read_text(encoding="utf-8"))
    scenes = [s for act in manifest["acts"] for s in act["scenes"]]
    assert len(scenes) == 50
    background_pixels = []
    foreground_pixels = []
    relative_pixels = []
    constrained = []
    for scene in scenes:
        bg = scene["layers"][0]
        front = scene["layers"][-1]
        bg_px = travel(bg)
        fg_px = travel(front)
        relative = abs(fg_px - bg_px)
        background_pixels.append(abs(bg_px))
        foreground_pixels.append(abs(fg_px))
        relative_pixels.append(relative)
        assert 50 - 0.1 <= abs(bg_px) <= 90 + 0.1, scene["id"]
        assert relative >= 120, (scene["id"], relative)
        assert bg["motion"]["startScale"] >= 1.16, scene["id"]
        assert bg["motion"]["endScale"] > bg["motion"]["startScale"], scene["id"]
        assert front["motion"]["endScale"] > front["motion"]["startScale"], scene["id"]
        if abs(fg_px) < 179.9:
            constrained.append((scene["id"], round(abs(fg_px), 1)))
        else:
            assert abs(fg_px) <= 260.1, scene["id"]
        for fraction in (0, 0.5, 1):
            for layer in scene["layers"][1:]:
                motion = layer["motion"]
                left, right = motion["focalBounds"]
                scale = motion["startScale"] + fraction * (motion["endScale"] - motion["startScale"])
                offset = WIDTH * (motion["startXPercent"] + fraction * (motion["endXPercent"] - motion["startXPercent"])) / 100
                displayed_left = WIDTH / 2 + (left - WIDTH / 2) * scale + offset
                displayed_right = WIDTH / 2 + (right - WIDTH / 2) * scale + offset
                assert displayed_left >= 0 and displayed_right <= WIDTH, (scene["id"], fraction)
            render(scene, fraction)
    assert {scene for scene, _ in constrained} == {"10", "46", "50"}, constrained
    print(f"PASS: {len(scenes) * 3} full-resolution composites cover every edge")
    print(f"Background: {min(background_pixels):.1f}–{max(background_pixels):.1f} px")
    print(f"Focal foreground: {min(foreground_pixels):.1f}–{max(foreground_pixels):.1f} px; 47/50 at least 180 px")
    print(f"Relative displacement: {min(relative_pixels):.1f}–{max(relative_pixels):.1f} px")
    print(f"Composition-limited focal scenes: {constrained}")


if __name__ == "__main__":
    main()
