# Isolated preparation: additional biome coverage

Source: main `622b41b1`. Sequential native routes, 180 m / 15 s, quality media,
seed 712. Both enable QA-only resident preparation and isolated GPU preparation.
Four CPU campaign processes remained active; one QA graphics context at a time.

| Biome/culture | New chunks | p95 ms | p99 ms | Max ms | Frames >100 ms |
|---|---:|---:|---:|---:|---:|
| Volcanes/Mapungubwe | 15 | 66.5 | 83.1 | 83.3 | 0 |
| Gran Canon/Musgum | 25 | 49.6 | 50.0 | 66.6 | 0 |

Both completed with unchanged serialized state, no reported errors, no failed
chunks/fallbacks or hidden samples. Each scene reported disposed before its tab
closed. These new-village scenes have no workers or crops: this does not establish
dense-farm coverage in these biomes, dynamic shadows, or saved-game compatibility.

Full reports are losslessly compressed; receipt hashes refer to original JSON.
Final screenshots are endpoint evidence only. No paired control was measured,
so timings cannot establish an optimization gain. Production activation remains
off pending transition continuity, remaining biome coverage and resource checks.
