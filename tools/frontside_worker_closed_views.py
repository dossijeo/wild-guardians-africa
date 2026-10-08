"""Prospective stratified worker views; no raster data or rejected-view masks."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = "998d8e34:worker-closed-subset-independent-v1"

def main():
    library = json.loads((ROOT / "public/content/worker-actions.json").read_text(encoding="utf-8"))
    clips = list(library["youngMale"]["actions"])
    assert len(clips) == 12
    biomes = ["sabana", "gran-rio", "manglares", "volcanes", "gran-canon", "desierto"]
    cases = []
    for view in range(2):
        for pose, fraction in enumerate([0, .25, .5, .75, 1]):
            for index, clip in enumerate(clips):
                key = f"{SEED}:{view}:{pose}:{clip}"
                digest = hashlib.sha256(key.encode()).digest()
                # Two independent directions per pose, spread through 16 azimuth
                # strata, five elevations, six environments and three light states.
                cases.append(dict(clipName=clip, fraction=fraction,
                    biome=biomes[(index + pose + 3*view) % 6],
                    night=[0, .5, 1][(index + 2*pose + view) % 3],
                    elevation=[-15, 5, 25, 55, 85][(index + pose + view) % 5],
                    azimuth=((index + 3*pose + 7*view) % 16)*22.5 +
                            2 + int.from_bytes(digest[:2], "big")/65535*18.5))
    report = dict(profile="WORKER_CLOSED_SUBSET_INDEPENDENT_V1", seed=SEED,
        sourceSha256=library["youngMale"]["sha256"], clips=clips,
        purpose="Prospective 120-case rejection screen: 12 clips x 5 fractions x 2 directions. Not exhaustive category acceptance or GPU benchmark.",
        cases=cases)
    target = ROOT / "docs/qa/frontside-model-pilot/worker-closed-subset-independent-v1-views.json"
    target.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(f"{len(cases)} prospective cases: {target.name}")

if __name__ == "__main__":
    main()
