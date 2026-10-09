"""Independent byte/receipt review; does not replay or approve campaigns."""
import argparse
import gzip
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("folder", type=Path)
parser.add_argument("--head", required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
batch = json.loads((args.folder / "batch-results.json").read_text(encoding="utf-8-sig"))
review = {
    "head": args.head,
    "recordedAtUtc": datetime.now(timezone.utc).isoformat(),
    "scope": "Independent original byte/hash/gzip and recorded verification-field review. Not a simulation replay, source re-audit, or release approval.",
    "cases": [],
}
for case in batch:
    folder = args.folder / (case["case"] + "-" + str(case["run"]))
    receipts = json.loads((folder / "archive-receipt.json").read_text(encoding="utf-8-sig"))
    total = 0
    for name, receipt in receipts.items():
        path = folder / name
        payload = path.read_bytes() if path.exists() else gzip.decompress((folder / (name + ".gz")).read_bytes())
        assert len(payload) == receipt["bytes"], (path, "size")
        assert hashlib.sha256(payload).hexdigest() == receipt["sha256"], (path, "sha256")
        if name.endswith(".json"):
            json.loads(payload)
        total += len(payload)
    verification = json.loads((folder / "root-verification.json").read_text(encoding="utf-8-sig"))
    assert verification["frozenSourcesVerified"] == 320, folder
    assert verification["recordedHead"] == "3324d17dd2305ea8595aea311c518cc6db2404ad", folder
    if verification["status"] == "verified":
        assert verification["completedNights"] == 100 and verification["result"] == "victory", folder
        fraction = verification["unoccupiedFraction"]
        expected = "accepted" if fraction < .25 else "not-accepted"
        assert verification["activityAcceptance"]["status"] == expected, folder
        assert case["activity"] == expected, folder
    else:
        assert verification["status"] == "failure-evidence-verified", folder
    review["cases"].append({
        "case": folder.name,
        "filesVerified": len(receipts),
        "bytesVerified": total,
        "verificationStatus": verification["status"],
        "activity": case.get("activity"),
    })
review["filesVerified"] = sum(c["filesVerified"] for c in review["cases"])
review["bytesVerified"] = sum(c["bytesVerified"] for c in review["cases"])
args.output.write_text(json.dumps(review, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"cases": len(review["cases"]), "files": review["filesVerified"], "bytes": review["bytesVerified"]}))
