# Opt-in last-tile lookup candidate

The retained planned-contour CPU profile identifies lattice lookup as a substantial self-time cost. This candidate avoids division/floor and Map lookup when an integer query remains within the preceding tile. It preserves exact coordinates, native height providers, invalidation, bounded tile capacity and restoration. Origins outside safe integer representation use the original lookup arithmetic.

The adapter is a separate module, `tools/terrain-lattice-last-tile-candidate.mjs`. It is not imported by v116, the campaign policy or production. The comparison helper substitutes it only in an in-memory copy of the QA integration module; it never rewrites that module on disk.

Fifty focused tests pass with no failures or skips. The twelve new tests compare native surfaces, slopes and water across all six biomes, tile boundaries, negative coordinates, different tile sizes, safe-integer limits, provider replacement and non-numeric values. The other tests retain the original integration/memo ownership and physical-certification checks. Full console evidence is `last-tile-candidate-tests.txt`.

Four cold copies of the exact saved v115 planned contour were evaluated in baseline/candidate/candidate/baseline order. Every complete physical certificate is deeply equal, excluding only lattice execution diagnostics, and every copied game serialization is unchanged. All native workers and five animal-radius checks pass. The quote remains one piece, one gate update and ten coins.

| Order | Adapter | Proof milliseconds |
| --- | --- | ---: |
| A | Original | 32,234.49 |
| B | Last-tile candidate | 22,646.02 |
| B | Last-tile candidate | 24,426.46 |
| A | Original | 27,205.55 |

The observed means are 29,720.02 and 23,536.24 ms (20.81% lower). **v116 was running concurrently**, so this is not isolated performance acceptance or a game frame-time result. Two observations per adapter are insufficient to establish a robust general speedup. Do not promote the candidate on this evidence alone.

Each run makes exactly 103,539,255 lattice requests, with identical hits, misses and resident tile counts. The candidate handles 97,166,588 queries using the last tile and performs 6,372,667 tile lookups. Both versions report 55,296 resident typed-array bytes; this measures those arrays, not peak process memory or all object metadata.

`v115-planned-perimeter-last-tile-abba.json` retains per-run measurements, source hashes and the identical physical-certificate hash. `v115-last-tile-timing-summary.json` records the arithmetic and explicitly leaves promotion and isolated acceptance false. Reproduce with `node tools/compare-planned-perimeter-last-tile.mjs <stopped-directory> <fresh-output>`. An isolated repeat and advancing native-state comparisons remain necessary before selecting it for a future campaign; do not change v116 in flight.

## Advancing-state comparison: no demonstrated timing benefit

`compare-advancing-last-tile.mjs` executes twenty native quarter-second ticks on each of two copied states, without player commands. All 21 serialized states match and the complete physical certificates at zero, 2.5 and five simulated seconds are deeply equal. Actual native deliveries change the ledger and living crop count; this is not an immobile fixture. The raw six measurements are retained in `v115-advancing-last-tile-native-comparison.json`.

The original adapter averages 20,682.72 ms per proof and the candidate averages 22,093.84 ms in this sequential, concurrent observation. Thus the earlier apparent AB/BA benefit does not establish a reliable net gain. The candidate remains off; do not promote it or reinterpret this result as a campaign failure.

A separate five-second native replay identifies a structural source of cache churn: the one remaining hypothetical wall keeps every field except `id` and `created` unchanged, but native deliveries advance the global counters used to assign those provisional metadata. Structures, villages, suppression and navigation version remain unchanged. Both the proof-view key and static-certificate signature include the quote metadata. The exact before/after piece and counters are preserved in `v115-provisional-wall-id-churn.json`.

Future work should first investigate stable metadata for **QA-only prospective pieces**, without changing actual purchase IDs, gate selection, native collisions, source ownership or the fresh worker checks. Equivalence must be tested, including collisions with existing IDs and changes in piece/gate geometry. No such normalization is active in v116.
