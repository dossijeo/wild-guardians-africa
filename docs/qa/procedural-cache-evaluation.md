# Optional procedural cache for continued games

Status: evaluated for storage; not implemented or accepted for production.

The player confirmed that new games retain variable seeds. Do not replace them
with thirty fixed biome/culture savestates. Continue optimizing their workers.
For continued games, investigate a disposable derived cache separate from the
canonical save and its recovery copy.

## Preliminary measurements, 2026-10-09

Node v20.11.0, CPU only. These are not browser loading benchmarks.

One representative Sabana chunk, seed `712`, native generator, chunk `(0,0)`:

| Representation | Bytes |
| --- | ---: |
| Terrain array | 497664 |
| Water array | 1080 |
| Ground mask | 4900 |
| Instance metadata JSON | 60663 |
| Combined binary arrays and metadata | 564307 |
| Gzip of combined bytes | 104190 |
| Ordinary JSON including numeric typed-array keys | 3065804 |

Generation took 87.8 ms in this Node sample. Extrapolating 25 identical chunks
gives 2.60 MB compressed, but neither an actual visible region nor all biomes
were measured. Do not use this estimate as a final storage budget.

A representative far-region request reconstructed by the feature branch's exact
request helper and controlled-save camera produced 1353 tree records:

| Quantity | Result |
| --- | ---: |
| Typed-array bytes | 289612 |
| JSON metadata bytes | 511915 |
| Combined bytes | 801527 |
| Gzip bytes | 330613 |
| Procedural generation | 1146.8 ms |
| Gzip | 23.7 ms |
| Gunzip | 2.93 ms |

Byte roundtrip was exact. This is a size experiment, not a production codec:
metadata describes array offsets/types separately and adoption was not tested.
The request was reconstructed, not captured from a live save. The source request
and raw report are in the loading feature worktree under
`docs/qa/interactive-loading-development/initial-far-candidate/representative-controlled-712-request.json`
and `.cache/root-procedural-snapshot-far-size.json` respectively.

The existing native browser diagnostic observed about 1703 ms in the first
far-region worker and another 715 ms across three subsequent workers. Removing
generation would not remove asset download/decode, GPU upload, compilation,
geometry adoption, seams or readiness fences. These worker durations cannot be
claimed as the net reduction in time until controls become available.

## Required experiment before implementation

- Compare total Continue readiness with regeneration versus cached data,
  including cache read, validation, decompression and GPU preparation.
- Measure real cache bytes across biomes, quality profiles and populated saves.
- Key by seed, complete generator configuration/profile, generator version and
  region descriptor; handle suppression and current gameplay state correctly.
- Keep canonical saves authoritative and compatible. Missing, corrupt, stale or
  evicted cache must fall back to generation.
- Bound disk usage and avoid duplicating shared models/textures or save backups.
- Capture retained CPU data without moving the live camera during autosave.
- Avoid expensive compression on the gameplay main thread. Check cancellation,
  late results, cleanup and memory peaks.

Do not serialize GPU objects or assume that a screenshot can replace a playable
procedural region. Prioritize finishing the interactive loading feature before
turning this separate optimization into production work.
