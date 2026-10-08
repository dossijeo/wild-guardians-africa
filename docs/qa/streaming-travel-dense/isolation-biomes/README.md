# Isolated preparation: additional biome coverage

Source: main `622b41b1`. Sequential native routes, 180 m / 15 s, quality media,
seed 712. Both enable QA-only resident preparation and isolated GPU preparation.
Four CPU campaign processes remained active; one QA graphics context at a time.

| Biome/culture | New chunks | p95 ms | p99 ms | Max ms | Frames >100 ms |
|---|---:|---:|---:|---:|---:|
| Volcanes/Mapungubwe | 15 | 66.5 | 83.1 | 83.3 | 0 |
| Gran Canon/Musgum | 25 | 49.6 | 50.0 | 66.6 | 0 |
| Manglares/Suajili | 15 | 83.0 | 99.7 | 99.8 | 0 |
| Desierto/Etiope | 15 | 33.4 | 49.8 | 66.5 | 0 |

Manglares/Desierto follow-up source: `6030c2f3`; only tests/evidence changed
since the first two routes. Four CPU campaigns remained live. Contexts were
disposed and tabs closed sequentially. No concurrent loading-screen GPU probe.

All completed with unchanged serialized state, no reported errors, no failed
chunks/fallbacks or hidden samples. Each scene reported disposed before its tab
closed. These new-village scenes have no workers or crops: this does not establish
dense-farm coverage in these biomes, dynamic shadows, or saved-game compatibility.

Full reports are losslessly compressed; receipt hashes refer to original JSON.
Final screenshots are endpoint evidence only. No paired control was measured,
so timings cannot establish an optimization gain. Production activation remains
off pending transition continuity, remaining biome coverage and resource checks.

`node docs/qa/streaming-travel-dense/isolation-biomes/verify.mjs` checks original
JSON hashes, recomputes frame summaries and validates the reported configuration,
state, errors and chunk invariants. It does not rerun the browser.

Lifecycle follow-up: 36 directed tests pass with the native preparation, isolated
root and resident preparation suites. Added integration cases cover draw failure,
fence cancellation and overlapping compilation completing out of order. Borrowed
geometry/materials remain undisposed; visibility, culling, shadow scheduling,
viewport/scissor and parent are restored. These tests use renderer doubles and
establish cleanup contracts, not physical RAM/VRAM neutrality or GPU performance.
