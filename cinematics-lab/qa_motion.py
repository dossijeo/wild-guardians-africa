"""Compare every motion track with the original lab and composite 50 scenes.

Static/image checks only; browser playback still needs manual acceptance.
"""

import json
from pathlib import Path

from render_motion_preview import render


ROOT = Path(__file__).parent
WIDTH = 1672
HEIGHT = 941


def main() -> None:
    manifest = json.loads((ROOT / "cinematics-manifest.json").read_text(encoding="utf-8"))
    scenes = [scene for act in manifest["acts"] for scene in act["scenes"]]
    assert len(scenes) == 50
    backgrounds = []
    foregrounds = []
    for scene in scenes:
        camera = scene["camera"]
        for layer in scene["layers"]:
            depth = layer["depth"]
            motion = layer["motion"]
            factor = 2.5 + 5.5 * depth  # 8e97966c baseline
            baseline_x = WIDTH * abs(camera["panXPercent"] * factor) / 100
            baseline_y = HEIGHT * abs(camera["panYPercent"] * factor) / 100
            actual_x = WIDTH * abs(motion["endXPercent"] - motion["startXPercent"]) / 100
            actual_y = HEIGHT * abs(motion["endYPercent"] - motion["startYPercent"]) / 100
            assert abs(actual_x / baseline_x - 1.25) < 0.002, (scene["id"], actual_x, baseline_x)
            assert abs(actual_y / baseline_y - 1.25) < 0.003, (scene["id"], actual_y, baseline_y)
            assert motion["startScale"] == 1.08
            expected_zoom = 1.08 + (camera["zoom"] - 1) * (1 + depth * 0.35)
            assert abs(motion["endScale"] - expected_zoom) < 0.00001
        backgrounds.append(scene["layers"][0]["motion"]["travelPixels"])
        foregrounds.append(scene["layers"][-1]["motion"]["travelPixels"])
        for fraction in (0, 0.5, 1):
            render(scene, fraction)
    print("PASS: 50 scene tracks preserve original zoom and 1.25× horizontal/vertical travel")
    print("PASS: 150 final-WebP composites cover all four edges")
    print(f"Background horizontal travel: {min(backgrounds):.1f}–{max(backgrounds):.1f} px")
    print(f"Focal horizontal travel: {min(foregrounds):.1f}–{max(foregrounds):.1f} px")


if __name__ == "__main__":
    main()
