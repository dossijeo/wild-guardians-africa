"""Convert every clean layer PNG to WebP through the Tinify HTTP API."""

import base64
import hashlib
import http.client
import io
import json
import os
import time
from pathlib import Path

from PIL import Image

from tinify_assets import request


def main() -> None:
    root = Path(__file__).parent
    key = os.environ.get("TINIFY_API_KEY")
    if not key:
        raise SystemExit("TINIFY_API_KEY is unavailable in the process environment")
    auth = "Basic " + base64.b64encode(("api:" + key).encode("ascii")).decode("ascii")
    report_path = root / "tinify-layers-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {}
    sources = sorted((root / "layers").glob("scene-??-*.png"))
    if len(sources) != 105:
        raise RuntimeError(f"Expected 105 layer sources, found {len(sources)}")
    for source in sources:
        raw = source.read_bytes()
        target = source.with_suffix(".webp")
        existing = report.get(source.stem)
        if existing and target.is_file() and existing.get("sourceSha256") == hashlib.sha256(raw).hexdigest() and existing.get("outputSha256") == hashlib.sha256(target.read_bytes()).hexdigest():
            continue
        _, headers = request("https://api.tinify.com/shrink", auth, raw, "image/png")
        location = headers.get("Location")
        if not location or not location.startswith("https://api.tinify.com/output/"):
            raise RuntimeError(f"Invalid Tinify output location for {source.name}")
        for attempt in range(4):
            try:
                webp, result_headers = request(location, auth, b'{"convert":{"type":"image/webp"}}', "application/json")
                break
            except http.client.IncompleteRead:
                if attempt == 3:
                    raise
                print(f"{source.stem}: truncated Tinify transfer; retrying ({attempt + 1}/3)", flush=True)
                time.sleep(2 ** attempt)
        with Image.open(io.BytesIO(webp)) as image:
            image.load()
            if image.format != "WEBP":
                raise RuntimeError(f"Invalid output format for {source.name}")
            alpha = "A" in image.getbands()
            if not source.stem.endswith("-background") and not alpha:
                raise RuntimeError(f"Alpha lost in {source.name}")
            dimensions = list(image.size)
            if dimensions != [1672, 941]:
                raise RuntimeError(f"Invalid dimensions for {source.name}: {dimensions}")
        temp = target.with_suffix(".webp.partial")
        temp.write_bytes(webp)
        temp.replace(target)
        report[source.stem] = {
            "sourceBytes": len(raw),
            "outputBytes": len(webp),
            "sourceSha256": hashlib.sha256(raw).hexdigest(),
            "outputSha256": hashlib.sha256(webp).hexdigest(),
            "alpha": alpha,
            "dimensions": dimensions,
            "compressionCount": result_headers.get("Compression-Count"),
        }
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"{source.stem}: {len(raw):,} -> {len(webp):,} B; alpha={alpha}", flush=True)
    print(f"Verified {len(report)} Tinify layer conversions", flush=True)


if __name__ == "__main__":
    main()
