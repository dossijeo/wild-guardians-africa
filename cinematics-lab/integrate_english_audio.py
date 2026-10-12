"""Add exact English DOCX paragraphs and verified Opus references to manifest."""

import argparse
import json
import re
from pathlib import Path

from docx import Document


ROOT = Path(__file__).parent


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("english_docx", type=Path)
    args = parser.parse_args()
    manifest_path = ROOT / "cinematics-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    report = json.loads((ROOT / "audio-report.json").read_text(encoding="utf-8"))
    paragraphs = [p.text for p in Document(args.english_docx).paragraphs]
    headings = [p for p in paragraphs if re.match(r"^ACT [IVX]+\s*[—–-]", p)]
    scenes_en = [p for p in paragraphs if re.match(r"^[1-5]\.\s+", p)]
    closings = [p for p in paragraphs if p.startswith("NARRATIVE CLOSURE")]
    if (len(headings), len(scenes_en), len(closings), len(report)) != (10, 50, 10, 100):
        raise ValueError("English script or audio count mismatch")
    flat = [s for act in manifest["acts"] for s in act["scenes"]]
    for act, heading, closing in zip(manifest["acts"], headings, closings):
        act["titleEN"] = re.split(r"\s*[—–-]\s*", heading, maxsplit=1)[1]
        act["closingRawEN"] = closing
    for index, (scene, raw) in enumerate(zip(flat, scenes_en)):
        if int(raw[0]) != scene["scene"]:
            raise ValueError(f"English scene sequence mismatch at {index+1}")
        scene["narrationRawEN"] = raw
        scene["audio"] = {}
        for language in ("ES", "EN"):
            key = f"{scene['act']:02d}-{scene['scene']:02d}-{language}"
            item = report[key]
            if item["codec"] != "opus" or item["channels"] != 1:
                raise ValueError(f"Unverified audio at {key}")
            if not (ROOT / item["output"]).is_file():
                raise FileNotFoundError(item["output"])
            scene["audio"][language] = {"file": item["output"], "durationSeconds": item["durationSeconds"]}
        scene["durationSeconds"] = round(max(x["durationSeconds"] for x in scene["audio"].values()) + 0.8, 2)
    manifest["titleEN"] = "Wild Guardians: The Guardians' Promise"
    manifest["sourceNoteEN"] = paragraphs[6]
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Integrated 50 exact English scene paragraphs, 10 closures and 100 Opus tracks")


if __name__ == "__main__":
    main()
