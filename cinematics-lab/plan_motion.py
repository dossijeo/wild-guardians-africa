"""Keep the original slow camera path, with 25% more translation.

The baseline is viewer.js at commit 8e97966c: factor 2.5 + 5.5 * depth,
8% initial overscan, camera.zoom-adjusted endpoint, one linear traversal
lasting the scene. Only horizontal/vertical travel is multiplied here.
"""

import json
from pathlib import Path


ROOT = Path(__file__).parent
GAIN = 1.25
WIDTH = 1672
HEIGHT = 941


def main() -> None:
    path = ROOT / "cinematics-manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    for act in manifest["acts"]:
        for scene in act["scenes"]:
            camera = scene["camera"]
            for layer in scene["layers"]:
                depth = layer["depth"]
                factor = (2.5 + 5.5 * depth) * GAIN
                x = camera["panXPercent"] * factor
                y = camera["panYPercent"] * factor
                layer["motion"] = {
                    "startXPercent": round(-x / 2, 4),
                    "endXPercent": round(x / 2, 4),
                    "startYPercent": round(-y / 2, 4),
                    "endYPercent": round(y / 2, 4),
                    "startScale": 1.08,
                    "endScale": round(1.08 + (camera["zoom"] - 1) * (1 + depth * 0.35), 5),
                    "travelPixels": round(WIDTH * abs(x) / 100, 1),
                    "verticalPixels": round(HEIGHT * abs(y) / 100, 1),
                }
    path.write_bytes((json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print("Planned 50 slow scene-length camera tracks at 1.25× original translation")


if __name__ == "__main__":
    main()
