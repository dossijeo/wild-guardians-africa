# Wild Engine BFS-clearing baseline

This isolated follow-up starts at main commit `673fa22f`, after the 16 MiB
activation. The production WASM SHA-256 is
`704606fa2b1cf2cada9d4742884866dd5a7e7e228683764032d5b5ef6cd84c07`.
No algorithm or gameplay code has changed in this branch.

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

The BFS code still clears `visited` and `previousNode` for every inter-sector
query. These direct measurements do **not** show that clearing those arrays is
a major share of game time: the numbers include traversal and route
reconstruction, and many queries end `unknown` at the resident frontier. They
are a reproducible correctness and timing baseline for a generation-stamping
candidate, not proof that the candidate should ship. A candidate must keep the
same result and route hashes, then improve equal-work ABBA timing and a real
short checkpoint before being adopted.

Run a case with:

```powershell
node tools/experiments/benchmark-wild-engine-bfs.mjs src/world/hierarchical-wasm/spatial-savanna.wasm output.json sabana animal
```

No full campaign was run for this baseline. The earlier 14-night profile in
the algorithms/memory experiment found a substantial unnamed WASM hotspot but
could not attribute it to BFS. The next diagnostic is a short, symbolized
checkpoint profile, so an algorithmic change targets demonstrated work rather
than the mere presence of an `assign` call.
