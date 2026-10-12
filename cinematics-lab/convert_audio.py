"""Extract the supplied voice archive and encode 100 mono Opus tracks.

The archive remains outside the repository. Every conversion records source and
output hashes, duration, codec and channel count for reproducible QA.
"""

import argparse
import hashlib
import io
import json
import re
import subprocess
import zipfile
from pathlib import Path


ROOT = Path(__file__).parent
PATTERN = re.compile(r"ACT_(\d{2})_SCENE_(\d{2})_(ES|EN)\.mp3$")


def probe(path: Path) -> dict:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,channels:format=duration", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    )
    data = json.loads(result.stdout)
    stream = data["streams"][0]
    return {"codec": stream["codec_name"], "channels": stream["channels"], "durationSeconds": round(float(data["format"]["duration"]), 3)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    archive = args.archive
    if not archive.is_file():
        raise FileNotFoundError(archive)
    output_dir = ROOT / "audio"
    output_dir.mkdir(exist_ok=True)
    report_path = ROOT / "audio-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {}
    with zipfile.ZipFile(archive) as zf:
        entries = {}
        for info in zf.infolist():
            match = PATTERN.search(info.filename)
            if match:
                key = f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
                if key in entries:
                    raise ValueError(f"Duplicate audio: {key}")
                entries[key] = info
        expected = {f"{act:02d}-{scene:02d}-{language}" for act in range(1, 11) for scene in range(1, 6) for language in ("ES", "EN")}
        if set(entries) != expected:
            raise ValueError(f"Audio coverage mismatch: missing={sorted(expected-set(entries))}; extra={sorted(set(entries)-expected)}")
        for key in sorted(entries):
            source = zf.read(entries[key])
            source_sha = hashlib.sha256(source).hexdigest()
            target = output_dir / f"scene-{key.lower()}.opus"
            old = report.get(key)
            if old and target.is_file() and old.get("sourceSha256") == source_sha and old.get("outputSha256") == hashlib.sha256(target.read_bytes()).hexdigest():
                continue
            process = subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", "pipe:0", "-map", "0:a:0", "-ac", "1", "-c:a", "libopus", "-b:a", "32k", "-vbr", "on", "-compression_level", "10", "-application", "audio", str(target)],
                input=source, capture_output=True,
            )
            if process.returncode:
                raise RuntimeError(f"ffmpeg failed for {key}: {process.stderr.decode('utf-8', errors='replace')[:400]}")
            metadata = probe(target)
            if metadata["codec"] != "opus" or metadata["channels"] != 1:
                raise ValueError(f"Invalid Opus output for {key}: {metadata}")
            output = target.read_bytes()
            report[key] = {
                "sourceArchiveEntry": entries[key].filename,
                "sourceCodec": "mp3",
                "sourceBytes": len(source),
                "sourceSha256": source_sha,
                "output": f"audio/{target.name}",
                "outputBytes": len(output),
                "outputSha256": hashlib.sha256(output).hexdigest(),
                **metadata,
            }
            report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"{key}: {len(source):,} -> {len(output):,} B, {metadata['durationSeconds']} s", flush=True)
    print(f"Validated {len(report)} mono Opus tracks", flush=True)


if __name__ == "__main__":
    main()
