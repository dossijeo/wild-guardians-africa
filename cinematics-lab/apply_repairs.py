"""Install the seven reviewed layer repairs without changing established motion."""

import copy
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).parent
EDITED_BACKGROUNDS = {
    "19": "exec-28395371-56a0-4964-a599-d809973132be.png",
    "31": "exec-792d2412-2ba9-4a19-a3f0-aaf671d86fb2.png",
    "33": "exec-9bbbc842-1305-4e12-b635-dec5742fc579.png",
    "35": "exec-6a20d41e-8bd3-421f-88ad-5a5456e186a4.png",
    "38": "exec-ac996517-e349-4a83-94e8-035fc7544399.png",
    "41": "exec-8a7e019e-b700-44a6-9365-ac3db912f5ca.png",
    "47": "exec-5b10418f-2a6b-48f1-829a-18a844afc70e.png",
}
NEW_GUARDIANS = {
    "31": "exec-fea62099-c94b-49a2-892d-ab965e4baa17.png",
    "35": "exec-5cb77bed-c600-4c67-9fdc-2765f2cdaad0.png",
    "41": "exec-7f0e7f91-2164-45e4-b7e1-b4a8a1266646.png",
    "47": "exec-8f392fd0-3f4a-414c-ae98-065948fdfdd4.png",
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    manifest_path = ROOT / "cinematics-manifest.json"
    provenance_path = ROOT / "layers" / "provenance.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    scenes = {scene["id"]: scene for act in manifest["acts"] for scene in act["scenes"]}
    revisions = ROOT / "layers" / "revisions"
    for scene_id in EDITED_BACKGROUNDS:
        scene = scenes[scene_id]
        assert len(scene["layers"]) in (2, 3), scene_id
        assert scene["layers"][0]["image"] == f"layers/scene-{scene_id}-background.webp"
        for role, generator in (("background", EDITED_BACKGROUNDS[scene_id]), ("guardian", NEW_GUARDIANS.get(scene_id))):
            if generator is None:
                continue
            source = revisions / f"scene-{scene_id}-{role}-v2.png"
            destination = ROOT / "layers" / f"scene-{scene_id}-{role}.png"
            assert source.is_file(), source
            shutil.copyfile(source, destination)
            with Image.open(destination) as image:
                if image.size == (1671, 941):
                    # Built-in image_gen occasionally omits one fully transparent
                    # right-edge pixel. Restore the agreed canvas without scaling art.
                    assert role == "guardian" and image.mode == "RGBA"
                    plate = Image.new("RGBA", (1672, 941))
                    plate.paste(image, (0, 0))
                    plate.save(destination)
                else:
                    assert image.size == (1672, 941), (destination, image.size)
            provenance[scene_id][role] = {
                "generatorFile": generator,
                "sha256": sha(destination),
                "bytes": destination.stat().st_size,
                "mode": "RGB" if role == "background" else "RGBA",
                "editNote": "Targeted image_gen repair reviewed at 0/50/100 percent; see qa-fixes/compare-scene-" + scene_id + ".jpg",
            }
        if scene_id in NEW_GUARDIANS and len(scene["layers"]) == 2:
            previous = scene["layers"][-1]
            scene["layers"].append({
                "image": f"layers/scene-{scene_id}-guardian.webp",
                "depth": previous["depth"],
                "role": "guardián recortado por delante del plano animal; rayos permanecen en fondo" if scene_id == "47" else "guardián recortado por delante de animales o humo",
                "motion": copy.deepcopy(previous["motion"]),
            })
    provenance_path.write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Installed 7 reconstructed backgrounds and 4 guardian cutouts; cloned existing focal motion")


if __name__ == "__main__":
    main()
