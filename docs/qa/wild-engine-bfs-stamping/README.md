# Wild Engine BFS-clearing baseline

This isolated follow-up starts at main commit `673fa22f`, after the 16 MiB
activation. The production WASM SHA-256 is
`704606fa2b1cf2cada9d4742884866dd5a7e7e228683764032d5b5ef6cd84c07`.
The candidate changes only graph-search bookkeeping; no gameplay rules change.

`benchmark-wild-engine-bfs.mjs` reuses the fixed direct-graph query workload
from the prior algorithms/memory experiment. It generates 49 chunks from seed
712 and issues 100 identical queries per round. The six JSON reports retain
the exact requests, outcomes, route hashes, timings, source revision, binary
hash and runner hash. Warm-round average elapsed milliseconds for 100 queries:

| Biome | Connectivity | Full route | Found / unknown |
| --- | ---: | ---: | ---: |
| Desierto | 1.71 | 5.99 | 21 / 79 |
| Gran Cañón | 2.52 | 7.33 | 34 / 63 |
| Gran Río | 3.77 | 9.44 | 40 / 60 |
| Manglares | 1.92 | 6.20 | 23 / 77 |
| Sabana | 3.11 | 8.13 | 48 / 52 |
| Volcanes | 3.55 | 7.85 | 55 / 45 |

The baseline clears `visited` and `previousNode` for every inter-sector query.
The candidate uses a per-profile generation marker and initializes the marker
vector only when it grows or the generation wraps. Predecessors are read only
for nodes visited in that query. Its WASM SHA-256 is
`7817ebadc3dfa4c4d32f6197b5c4eb53468ad5f7f23293d72b902c23a7707095`;
the binary is 524 bytes larger than the baseline.

[CI run 38875396842](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38875396842)
compiled both variants with pinned Emscripten. The rebuilt baseline is
byte-identical to the checked-in 16 MiB binary. Candidate spatial prototype
and playable contracts passed. Alternating baseline/candidate/candidate/baseline
queries kept exact outcomes and route hashes in all six biomes. Mean warm
route-query time for 100 requests fell by 34–52% depending on biome;
connectivity-only queries ranged from 4% faster to 4% slower. The archived
`comparison.json` and raw CI artifact retain all pair timings.

Two short checkpoints were then replayed locally in ABBA order using those
exact CI binaries. Sabana day 13, 50 ticks, had 545 path calls in each run;
mean total time was 488.45 ms baseline and 483.93 ms candidate (0.9% less).
Gran Cañón day 6, 170 ticks, entered a raid with eight animals and made 392
approach calls; mean total time was 619.44 ms baseline and 585.21 ms
candidate (5.5% less). Each of the four replays per checkpoint ended with the
same state hash and identical call counts. These short, instrumented replays
show a promising but workload-dependent improvement; they do not prove a
sustained campaign gain or memory safety at extreme scale. The project owner
approved adopting this measured gain without requiring a full campaign for
this isolated optimization.

After copying the exact CI candidate artifact into the worktree, the local
spatial prototype suite passed 59/59 and the playable suite passed 188/188.
The standard CI validation and Windows build run against that committed binary
after the evidence commit, rather than against the former baseline binary.

Run a case with:

```powershell
node tools/experiments/benchmark-wild-engine-bfs.mjs src/world/hierarchical-wasm/spatial-savanna.wasm output.json sabana animal
```

No full campaign was run for this experiment. The earlier 14-night profile in
the algorithms/memory experiment found a substantial unnamed WASM hotspot but
could not attribute it to BFS. The next diagnostic is a short, symbolized
checkpoint profile, so an algorithmic change targets demonstrated work rather
than the mere presence of an `assign` call.
