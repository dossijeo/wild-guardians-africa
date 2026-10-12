"""Plan perceptible camera tracks from each layer's alpha footprint.

The largest opaque component approximates the focal subject. Its bounds keep
faces/animals in frame; especially wide groups may receive shorter travel.
"""

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).parent
WIDTH = 1672


def focal_bounds(path: Path) -> tuple[int, int]:
    alpha = np.asarray(Image.open(path).getchannel("A"))
    count, _, stats, _ = cv2.connectedComponentsWithStats((alpha > 64).astype("uint8"), 8)
    if count < 2:
        raise ValueError(f"No foreground mask in {path}")
    winner = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    x = int(stats[winner, cv2.CC_STAT_LEFT])
    return x, x + int(stats[winner, cv2.CC_STAT_WIDTH])


def focal_track(layer: dict, scene: dict, desired: float, direction: int) -> dict:
    path = ROOT / layer["image"].replace(".webp", ".png")
    left, right = focal_bounds(path)
    end_scale = 1 + (scene["camera"]["zoom"] - 1) * 0.45
    scaled_left = WIDTH / 2 + (left - WIDTH / 2) * end_scale
    scaled_right = WIDTH / 2 + (right - WIDTH / 2) * end_scale
    allowed_min = -scaled_left + 6
    allowed_max = WIDTH - scaled_right - 6
    travel = max(0, min(desired, allowed_max - allowed_min))
    # Keep the path as close as possible to the original composition.
    center = min(allowed_max - travel / 2, max(allowed_min + travel / 2, 0))
    start = center - direction * travel / 2
    end = center + direction * travel / 2
    return {
        "startXPercent": round(start / WIDTH * 100, 4),
        "endXPercent": round(end / WIDTH * 100, 4),
        "startScale": 1,
        "endScale": round(end_scale, 5),
        "travelPixels": round(travel, 1),
        "desiredPixels": round(desired, 1),
        "focalBounds": [left, right],
    }


def main() -> None:
    path = ROOT / "cinematics-manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    limited = []
    for act in manifest["acts"]:
        for scene in act["scenes"]:
            camera = scene["camera"]
            pan = abs(camera["panXPercent"])
            direction = 1 if camera["panXPercent"] >= 0 else -1
            amount = min(1, max(0, (pan - 0.35) / 0.35))
            background_travel = 50 + 40 * amount
            focal_desired = 180 + 80 * amount
            for layer in scene["layers"][1:]:
                share = min(1, layer["depth"] / 0.9)
                desired = background_travel + (focal_desired - background_travel) * share
                layer["motion"] = focal_track(layer, scene, desired, direction)
                if layer is scene["layers"][-1] and layer["motion"]["travelPixels"] < focal_desired - 2:
                    limited.append((scene["id"], layer["motion"]["travelPixels"], focal_desired))
            focal_actual = scene["layers"][-1]["motion"]["travelPixels"]
            if focal_actual - background_travel < 120:
                background_travel = min(90, max(background_travel, 130 - focal_actual))
            bg_direction = -direction if focal_actual - background_travel < 120 else direction
            bg = scene["layers"][0]
            bg["motion"] = {
                "startXPercent": round(-bg_direction * background_travel / 2 / WIDTH * 100, 4),
                "endXPercent": round(bg_direction * background_travel / 2 / WIDTH * 100, 4),
                "startScale": 1.16,
                "endScale": round(1.16 + camera["zoom"] - 1, 5),
                "travelPixels": round(background_travel, 1),
            }
    path.write_bytes((json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(f"Planned {sum(len(a['scenes']) for a in manifest['acts'])} scenes; focal travel limited by bounds: {limited}")


if __name__ == "__main__":
    main()
