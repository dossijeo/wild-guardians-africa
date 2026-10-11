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
