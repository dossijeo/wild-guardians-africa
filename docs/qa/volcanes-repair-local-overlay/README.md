# Volcanes repair overlay: localize removed-wall probes

The Volcanes/712 day-19–22 profile on the then-current `main` attributed 26.4/45.3 s of sampled `Game.tick` time to `planRepairAccess`; 18.2 s was in the native reachability search. The previous JS batching change had already removed repeated per-witness calls. The remaining native `spatial_overlay_reach_batch` probed **every** grid edge continuously whenever a hypothesis removed one wall, even if that wall was far away.

The experimental change indexes the physical footprint of removed barriers using the same padded spatial buckets as proposed barriers. A confirmed grid edge outside both affected buckets retains `lazy_grid_edge`; an edge near a changed barrier, polygon or removed prop still receives the full continuous `overlaySegmentClear` check. The 2 m index padding exceeds the maximum actor radius plus a unit grid edge. The confirmed world, revisions and paths are unchanged by the read-only overlay. This changes no game rule or repair policy.

## Reproduction

Source SHA-256 (`src/simulation/game.js`) for both campaign runs: `1ed97bd8d8722b42abed07b70767e112df287c102c892c136d2e2fac78111067`. Baseline WASM SHA-256: `09616da85bf59c50c0cde7b743a4bdccb2eac06ec4eb0b79f79c44ef71d9caa9`; candidate: `d7a811fb15b97668a07bd05c5501e6956d12269d439188a2991234d8bc1ae8aa`. Emscripten 3.1.5, `-O3`, 16 MiB initial memory with growth, same machine and campaign settings. Original WASM 520,225 bytes; candidate 520,654 bytes (+429 bytes).

Build the candidate with `bash tools/build-spatial-savanna-wasm.sh` in the WSL environment. To reproduce the frozen query without replacing the shipped WASM, set `WILD_ENGINE_REPAIR_WASM` to a separately built candidate and run `node tools/experiments/profile-repair-access.mjs tests/fixtures/volcanes712-day19-repair-before-arrival.json.gz 0` with `WILD_ENGINE_REPAIR_ADVANCE_SECONDS=0.2`. For the campaign, set `WILD_ENGINE_SPATIAL_SERVICES_WASM` to the candidate, then run `node tools/experiments/compare-repair-preview-campaign.mjs batch OUTPUT.json 22 712`; unset it for the baseline. The script records both source and WASM hashes. Reports: [baseline](baseline-22.json), [candidate](candidate-22.json).

| Measure | Baseline | Candidate | Change |
| --- | ---: | ---: | ---: |
| Frozen repair query, A/B/B/A (ms) | 4,364 / 4,297 | 346 / 343 | ~92% less |
| Campaign `Game.tick`, 22 nights (s) | 89.67 | 67.73 | 24.5% less |
| `Game.tick`, nights 19–22 (s) | 41.40 | 19.47 | 53.0% less |
| Campaign wall time (s) | 131.14 | 109.54 | 16.5% less |
| Day 19 `Game.tick` (s) | 13.93 | 4.78 | 65.7% less |
| Day 21 `Game.tick` (s) | 10.65 | 6.24 | 41.4% less |
| Day 22 `Game.tick` (s) | 13.52 | 5.05 | 62.6% less |

All 22 serialized day-state hashes match, as do crop counts, money and destroyed-crop counts. Both runs report verified raid evidence. The existing Volcanes repair test compares the reverse batch with individual physical reach queries for every candidate gate in this frozen state; it passed with the candidate. The native repair, intent differential and index tests also passed (12/12). The campaign was A/B rather than repeated ABBA, so wall-time differences include ordinary run variation; the large day-19/21/22 changes also appear in the repeated frozen A/B/B/A query. This eliminates the measured redundant probes but does not imply every remaining repair check is cheap.
