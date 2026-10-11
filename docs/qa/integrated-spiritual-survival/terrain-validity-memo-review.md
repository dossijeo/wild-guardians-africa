# QA terrain query memo experiment

The optional `terrainMemo` adapter caches exact native terrain-validity queries,
including worker slope-sweep peaks. It does not cache solid/prop collisions,
round coordinates, change crops, issue actions or bypass worker service checks.
It is disabled by default and is not a production change. A single bounded
65,536-entry cache is shared by the proof views of one terrain field. Configuration
is frozen during synchronous read-only certification and compared between
installations; method identities and navigation epochs are checked per query.
The original terrain/lattice methods are restored on success and exceptions.

61 focused tests passed, with no failures/skips, including six-biome result/peak
comparisons, shared terrain with independent obstacles, invalidation, bounded
eviction, resource restoration and an entire native Canyon certificate comparison.

## First candidate: rejected for performance

`v111-stopped-contour-terrain-memo.json` preserves the first candidate and its
source hashes on the frozen stopped-v111 snapshot. The full physical certificate
matches the previous candidate exactly, excluding only execution counters.
Cold certification took **45,333.33 ms** versus the historical **11,054.64 ms**.
This is a clear regression; no campaign was restarted and the option stays off.

There were 1,303,274 terrain requests, 416,002 hits, 887,272 misses and 821,736
evictions. The memo is experiencing significant churn. Its initial eviction used
a new Map iterator each time, despite the repository already providing a reusable
FIFO cursor specifically to avoid scanning deleted prefixes. The next candidate
will use that existing helper and must be measured independently. The negative
result and source version are retained rather than overwritten.

The worker-service rejection remains `native-worker-centre-service-unproven`.
This experiment does not establish an economic defeat or campaign correctness.

```
node --test tests/terrain-validity-memo-candidate.test.js tests/native-integrated-perimeter-proof.test.js tests/static-animal-certificate-cache.test.js tests/terrain-lattice-tile-candidate.test.js tests/native-paid-contour-proof.test.js
```

Use `probe-stopped-contour-recertification.mjs candidate-terrain-memo STOPPED_DIR
FRESH_OUTPUT` and compare the output with
`compare-terrain-memo-recertification.mjs BASELINE CANDIDATE FRESH_OUTPUT`.
All reports are sequential observations, not statistical AB/BA acceptance.
