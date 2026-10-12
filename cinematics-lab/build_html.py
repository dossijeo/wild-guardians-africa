"""Create the self-contained offline HTML. --sample builds one-scene QA preview."""

import argparse
import base64
import json
from pathlib import Path


ROOT = Path(__file__).parent


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", action="store_true")
    args = ap.parse_args()
    manifest = json.loads((ROOT / "cinematics-manifest.json").read_text(encoding="utf-8"))
    if args.sample:
        manifest["acts"] = manifest["acts"][:1]
        manifest["acts"][0]["scenes"] = manifest["acts"][0]["scenes"][:1]
        manifest["actCount"] = manifest["sceneCount"] = 1
    scenes = [s for act in manifest["acts"] for s in act["scenes"]]
    images = {}
    audio = {}
    for scene in scenes:
        file = ROOT / scene["image"]
        if not file.is_file():
            raise FileNotFoundError(f"Cannot build complete HTML without {file}")
        # Keep the flat Tinify master as a separate review asset. Layered scenes
        # embed only their plates so mobile browsers never decode both versions.
        if not scene["layers"]:
            images[scene["id"]] = "data:image/webp;base64," + base64.b64encode(file.read_bytes()).decode("ascii")
        for layer in scene["layers"]:
            layer_file = ROOT / layer["image"]
            if not layer_file.is_file():
                raise FileNotFoundError(f"Cannot build parallax without {layer_file}")
            images[layer["image"]] = "data:image/webp;base64," + base64.b64encode(layer_file.read_bytes()).decode("ascii")
        for language, voice in scene["audio"].items():
            audio_file = ROOT / voice["file"]
            if not audio_file.is_file():
                raise FileNotFoundError(f"Cannot build audio without {audio_file}")
            audio[f"{scene['id']}-{language}"] = "data:audio/ogg;codecs=opus;base64," + base64.b64encode(audio_file.read_bytes()).decode("ascii")
    data = json.dumps({"manifest": manifest, "images": images, "audio": audio}, ensure_ascii=False, separators=(",", ":"))
    data = data.replace("</", "<\\/")
    template = (ROOT / "viewer.template.html").read_text(encoding="utf-8")
    if template.count("__INLINE_DATA__") != 1 or template.count("__VIEWER_SCRIPT__") != 1:
        raise ValueError("Missing or duplicate inline markers")
    script = (ROOT / "viewer.js").read_text(encoding="utf-8")
    out = ROOT / ("preview-acto-01-escena-01.html" if args.sample else "wild-guardians-cinematics-lab.html")
    out.write_bytes(template.replace("__INLINE_DATA__", data).replace("__VIEWER_SCRIPT__", script).replace("\r\n", "\n").encode("utf-8"))
    print(f"Built {out.name}: {len(scenes)} scene(s), {out.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
