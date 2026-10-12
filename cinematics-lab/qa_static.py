"""Independent source, asset and offline-bundle checks for the 50-scene lab."""

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

from docx import Document
from PIL import Image


ROOT = Path(__file__).parent


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("spanish_docx", type=Path)
    ap.add_argument("english_docx", type=Path)
    ap.add_argument("audio_zip", type=Path)
    args = ap.parse_args()
    m = json.loads((ROOT / "cinematics-manifest.json").read_text(encoding="utf-8"))
    acts = m["acts"]
    scenes = [s for a in acts for s in a["scenes"]]
    assert len(acts) == 10 and len(scenes) == 50 and all(len(a["scenes"]) == 5 for a in acts)
    for doc, lang in ((args.spanish_docx, "ES"), (args.english_docx, "EN")):
        paragraphs = [p.text for p in Document(doc).paragraphs]
        texts = [p for p in paragraphs if re.match(r"^[1-5]\.\s+", p)]
        closes = [p for p in paragraphs if p.startswith("CIERRE NARRATIVO" if lang == "ES" else "NARRATIVE CLOSURE")]
        assert len(texts) == 50 and len(closes) == 10
        assert texts == [s["narrationRaw" if lang == "ES" else "narrationRawEN"] for s in scenes]
        assert closes == [a["closingRaw" if lang == "ES" else "closingRawEN"] for a in acts]
    base = json.loads((ROOT / "tinify-report.json").read_text(encoding="utf-8"))["scenes"]
    source_provenance = json.loads((ROOT / "sources/provenance.json").read_text(encoding="utf-8"))
    layers = json.loads((ROOT / "tinify-layers-report.json").read_text(encoding="utf-8"))
    layer_provenance = json.loads((ROOT / "layers/provenance.json").read_text(encoding="utf-8"))
    audio = json.loads((ROOT / "audio-report.json").read_text(encoding="utf-8"))
    assert len(base) == 50 and len(source_provenance) == 50 and len(layers) == 101 and len(layer_provenance) == 50 and len(audio) == 100
    for s in scenes:
        sid = s["id"]
        image = ROOT / s["image"]
        assert image.is_file() and digest(image) == base[sid]["outputSha256"]
        assert digest(ROOT / "sources" / f"scene-{sid}.png") == base[sid]["sourceSha256"] == source_provenance[sid]["pngSha256"]
        with Image.open(image) as im:
            assert im.format == "WEBP" and im.size == (1672, 941)
        assert len(s["layers"]) == (3 if sid == "01" else 2)
        assert s["layers"][0]["depth"] == 0
        for layer in s["layers"]:
            path = ROOT / layer["image"]
            row = layers[path.stem]
            assert digest(path) == row["outputSha256"]
            assert digest(path.with_suffix(".png")) == row["sourceSha256"]
            role = path.stem.removeprefix(f"scene-{sid}-")
            assert digest(path.with_suffix(".png")) == layer_provenance[sid][role]["sha256"]
            with Image.open(path) as im:
                assert im.format == "WEBP" and im.size == (1672, 941)
                assert ("A" in im.getbands()) == (not path.stem.endswith("-background"))
        for lang in ("ES", "EN"):
            key = f"{s['act']:02d}-{s['scene']:02d}-{lang}"
            row = audio[key]
            path = ROOT / s["audio"][lang]["file"]
            assert path.is_file() and digest(path) == row["outputSha256"]
            assert row["codec"] == "opus" and row["channels"] == 1
            assert s["audio"][lang]["durationSeconds"] == row["durationSeconds"]
            assert s["durationSeconds"] >= row["durationSeconds"] + 0.79
    with zipfile.ZipFile(args.audio_zip) as zf:
        for key, row in audio.items():
            assert hashlib.sha256(zf.read(row["sourceArchiveEntry"])).hexdigest() == row["sourceSha256"]
    html = (ROOT / "wild-guardians-cinematics-lab.html").read_text(encoding="utf-8")
    match = re.search(r'<script id="inline-data" type="application/json">(.*?)</script>', html, re.S)
    assert match
    bundle = json.loads(match.group(1))
    assert bundle["manifest"] == m
    assert len(bundle["images"]) == 101 and len(bundle["audio"]) == 100
    assert all(k.startswith("layers/") for k in bundle["images"])
    assert all(x.startswith("data:image/webp;base64,") for x in bundle["images"].values())
    assert all(x.startswith("data:audio/ogg;codecs=opus;base64,") for x in bundle["audio"].values())
    assert "__INLINE_DATA__" not in html and "__VIEWER_SCRIPT__" not in html
    assert not re.search(r"<script[^>]+src=|<link[^>]+href=", html)
    print("PASS: 50 ES + 50 EN scene paragraphs and 10 + 10 closures match DOCX exactly")
    print("PASS: 50 Tinify base WebP and 101 Tinify layers decode at 1672x941; 51 alpha cutouts")
    print("PASS: 100 mono Opus outputs match ZIP provenance and scene timing")
    print("PASS: offline HTML embeds only 101 layer WebP and 100 Opus tracks, no external scripts/styles")


if __name__ == "__main__":
    main()
