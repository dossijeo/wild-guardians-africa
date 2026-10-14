"""Losslessly bundle the paired Desert QA captures so the PR stays reviewable."""
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json


ROOT = Path(__file__).resolve().parents[2] / "docs/qa/evolutionary-balance/post-intro-desierto-gate-replay-21"
ARCHIVE = ROOT / "raid-probes.zip"
MEMBERS = sorted(
    path
    for directory in (ROOT / "results", ROOT / "no-walls-results")
    for pattern in ("*-probe.json.gz", "*-connectivity.json")
    for path in directory.glob(pattern)
)
if not MEMBERS or ARCHIVE.exists():
    raise SystemExit("Expected unarchived raid probes and no existing bundle")

original = {path.relative_to(ROOT).as_posix(): path.read_bytes() for path in MEMBERS}
with ZipFile(ARCHIVE, "w", compression=ZIP_DEFLATED, compresslevel=9) as bundle:
    for name, data in original.items():
        bundle.writestr(name, data)
with ZipFile(ARCHIVE) as bundle:
    if set(bundle.namelist()) != set(original):
        raise SystemExit("Raid probe bundle member mismatch")
    for name, data in original.items():
        if bundle.read(name) != data:
            raise SystemExit(f"Raid probe bundle roundtrip failed: {name}")

for path in MEMBERS:
    path.unlink()

files = []
for directory in (ROOT / "results", ROOT / "no-walls-results"):
    for path in directory.iterdir():
        if path.is_file():
            data = path.read_bytes()
            files.append({"path": path.relative_to(ROOT).as_posix(), "bytes": len(data),
                          "sha256": sha256(data).hexdigest()})
data = ARCHIVE.read_bytes()
files.append({"path": ARCHIVE.name, "bytes": len(data), "sha256": sha256(data).hexdigest()})
index = {"sourceHash": "2b208619dca8c79d3bd859493e2e735db0e78a60",
         "files": sorted(files, key=lambda item: item["path"]),
         "archiveMembers": [
             {"path": name, "bytes": len(data), "sha256": sha256(data).hexdigest()}
             for name, data in sorted(original.items())
         ]}
(ROOT / "integrity.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Archived and verified {len(original)} raid probes in {ARCHIVE.name}")
