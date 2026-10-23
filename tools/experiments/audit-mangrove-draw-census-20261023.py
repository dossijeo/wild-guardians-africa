"""Compare diagnostic draw multisets without relying on process-local object IDs.
Census instrumentation changes CPU cost: never treat these runs as benchmarks.
"""
import json
import sys
from pathlib import Path
from collections import Counter, defaultdict

root = Path(sys.argv[1])
records = json.loads((root / "benchmarks.json").read_text())["records"]
start = int(sys.argv[2]) if len(sys.argv) > 2 else 0
records = records[start:]
phases = defaultdict(list)
for record in records:
    assert not record["errors"]
    phases[record["phase"]].append(record)

def signature(draw):
    return (draw["path"], draw["target"], draw["material"],
            draw["triangles"], draw["calls"], draw["count"])

changes = []
invalid = []
for phase, runs in phases.items():
    base = runs[0]["measurements"][0]["frames"]
    for run_index, record in enumerate(runs[1:], 1):
        measured = record["measurements"][0]
        assert measured["before"] == measured["after"]
        assert measured["glError"] == 0
        assert len(measured["frames"]) == len(base)
        for original, candidate in zip(base, measured["frames"]):
            assert original["camera"] == candidate["camera"]
            assert original["coverage"] == candidate["coverage"]
            if any(sum(d["calls"] for d in f["draws"]) != f["calls"] or sum(d["triangles"] for d in f["draws"]) != f["triangles"] for f in [original, candidate]):
                invalid.append(dict(phase=phase, run=run_index, frame=original["frame"]))
                continue
            a = Counter(signature(d) for d in original["draws"] if d["calls"])
            b = Counter(signature(d) for d in candidate["draws"] if d["calls"])
            delta = [candidate[k] - original[k] for k in ("calls", "triangles")]
            if a != b or delta != [0, 0]:
                changes.append(dict(phase=phase, run=run_index, variant=record["variant"],
                    frame=original["frame"], delta=delta,
                    removed=list((a-b).items()), added=list((b-a).items())))
result = dict(records=len(records), diagnosticOnly=True, differences=changes, invalidCensuses=invalid,
              limitation="Names may identify batches rather than individual assets; IDs are local to each page.")
(root / ("draw-differences.json" if start == 0 else f"draw-differences-from-{start}.json")).write_text(json.dumps(result, indent=2)+"\n", encoding="utf-8", newline="\n")
print(json.dumps(dict(records=len(records), changedFrames=len(changes), invalidCensuses=len(invalid), firstChanges=[{**c,"removed":c["removed"][:3],"added":c["added"][:3]} for c in changes[:6]]), indent=2))
