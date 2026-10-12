"""Convert PNG masters to WebP through Tinify's authenticated HTTPS API.

The API key is read only from TINIFY_API_KEY in this process. Nothing writes it.
Results and counts are recorded without request headers or credentials.
"""

import argparse
import base64
import hashlib
import io
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).parent


def request(url: str, auth: str, body: bytes, content_type: str):
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Authorization": auth, "Content-Type": content_type},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return response.read(), response.headers
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Tinify HTTP {exc.code} at {url.split('/')[3]}") from None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=50)
    args = ap.parse_args()
    key = os.environ.get("TINIFY_API_KEY")
    if not key:
        raise SystemExit("TINIFY_API_KEY is unavailable in the process environment")
    auth = "Basic " + base64.b64encode(("api:" + key).encode("ascii")).decode("ascii")
    report_path = ROOT / "tinify-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {"service": "Tinify HTTPS API", "source": "PNG masters", "output": "WebP", "scenes": {}}
    count = 0
    for num in range(1, 51):
        scene_id = f"{num:02d}"
        if scene_id in report["scenes"]:
            continue
        source = ROOT / "sources" / f"scene-{scene_id}.png"
        target = ROOT / "assets" / f"scene-{scene_id}.webp"
        if not source.is_file():
            raise FileNotFoundError(source)
        source_data = source.read_bytes()
        _, upload_headers = request("https://api.tinify.com/shrink", auth, source_data, "image/png")
        location = upload_headers.get("Location")
        if not location or not location.startswith("https://api.tinify.com/output/"):
            raise RuntimeError(f"Invalid Tinify output location for scene {scene_id}")
        converted, convert_headers = request(location, auth, b'{"convert":{"type":"image/webp"}}', "application/json")
        with Image.open(io.BytesIO(converted)) as image:
            image.load()
            if image.format != "WEBP" or image.size != (1672, 941):
                raise RuntimeError(f"Invalid Tinify image for scene {scene_id}")
            mode = image.mode
        temp = target.with_suffix(".webp.partial")
        temp.write_bytes(converted)
        temp.replace(target)
        report["scenes"][scene_id] = {
            "sourceBytes": len(source_data),
            "outputBytes": len(converted),
            "sourceSha256": hashlib.sha256(source_data).hexdigest(),
            "outputSha256": hashlib.sha256(converted).hexdigest(),
            "outputMode": mode,
            "compressionCount": convert_headers.get("Compression-Count"),
            "status": "verified WebP from Tinify",
        }
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        count += 1
        print(f"scene-{scene_id}: {len(source_data):,} -> {len(converted):,} B", flush=True)
        if count >= args.limit:
            break
    print(f"Tinify complete: {len(report['scenes'])}/50 scenes", flush=True)


if __name__ == "__main__":
    main()
