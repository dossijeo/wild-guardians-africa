"""Prove seven local repairs leave the approved cinematic pacing intact."""

import json
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).parent
TARGETS = {"19", "31", "33", "35", "38", "41", "47"}
GUARDIANS = {"31", "35", "41", "47"}


def flat(data: dict) -> dict:
    return {scene["id"]: scene for act in data["acts"] for scene in act["scenes"]}


def main() -> None:
    baseline = json.loads(subprocess.check_output(
        ["git", "show", "c6ee2d78:cinematics-lab/cinematics-manifest.json"],
        cwd=ROOT, text=True, encoding="utf-8"))
    current = json.loads((ROOT / "cinematics-manifest.json").read_text(encoding="utf-8"))
    old, new = flat(baseline), flat(current)
    assert old.keys() == new.keys() and len(old) == 50
    for sid in old:
        if sid not in TARGETS:
            assert old[sid] == new[sid], sid
            continue
        before, after = old[sid].copy(), new[sid].copy()
        old_layers, new_layers = before.pop("layers"), after.pop("layers")
        assert before == after, sid  # narration, voice, duration, camera
        assert new_layers[:len(old_layers)] == old_layers, sid
        assert len(new_layers) == len(old_layers) + (sid in GUARDIANS), sid
        if sid in GUARDIANS:
            assert new_layers[-1]["motion"] == old_layers[-1]["motion"], sid
            assert new_layers[-1]["depth"] == old_layers[-1]["depth"], sid
    layer_root = ROOT / "layers"
    assert len(list(layer_root.glob("scene-??-*.png"))) == 105
    assert len(list(layer_root.glob("scene-??-*.webp"))) == 105
    for sid in TARGETS:
        for role in (("background", "guardian") if sid in GUARDIANS else ("background",)):
            for ext in ("png", "webp"):
                with Image.open(layer_root / f"scene-{sid}-{role}.{ext}") as image:
                    image.load()
                    assert image.size == (1672, 941)
                    assert ("A" in image.getbands()) == (role == "guardian")
    print("PASS: 43 untouched scenes identical to c6ee2d78; 7 edited scenes retain narration, audio, camera, duration and existing layer motion")
    print("PASS: four new guardian layers copy the approved focal motion and depth exactly")
    print("PASS: 105 layer PNG and WebP files, with 11 repaired outputs correctly sized and alpha-typed")


if __name__ == "__main__":
    main()
