# Low profile: solar shadows OFF versus 2048 ON

Exploratory A/B/A/B with final B retried after preparation timeout; see retry-note.txt. Intel UHD,1280×720, same populated paused save,8m camera movement, full backgrounds, same fern geometry/density. This toggles shadows for the whole scene.

| Run | Shadows | Phase | GPU mean ms | CPU render ms | Cadence mean ms | Cadence p95 ms |
|---|---|---|---:|---:|---:|---:|
| 1 | OFF | day | 16.630 | 6.416 | 21.456 | 26.500 |
| 2 | OFF | night | 17.334 | 7.327 | 25.327 | 32.100 |
| 3 | 2048 | day | 22.068 | 8.227 | 28.888 | 37.900 |
| 4 | 2048 | night | 21.573 | 8.358 | 27.987 | 34.200 |
| 5 | OFF | day | 16.147 | 6.983 | 25.053 | 31.400 |
| 6 | OFF | night | 17.424 | 5.962 | 22.021 | 29.000 |
| 7 | 2048 | day | 22.468 | 8.187 | 26.453 | 33.100 |
| 8 | 2048 | night | 23.336 | 8.000 | 28.429 | 35.100 |

All720GPU queries valid, no GL errors, unchanged simulation state. Repeated GPU/cadence camera, draw and triangle sequences match exactly; repeated resource counts match. Actual allocated shadow targets verified, not just configured size. GPU additional cost: day +5.44/+6.32ms; night +4.24/+5.91ms. CPU also rises. These are render measurements in a paused campaign, not active-game FPS. The retry gap is a limitation.

Recommendation: retain the visually richer variant as an optional candidate, but preserve low default OFF and medium artistic coverage. No density was reduced between A/B. Do not attribute whole-scene shadow cost solely to ferns. Low coverage distance still truncates distant foliage and is not solved by this option. Actual VRAM bytes/overdraw and all-biome validation remain unmeasured.

Captures and reproduction: ../holly-fern-low-plus-shadow-20261023/README.md. Preliminary low768/low2048 configured-size comparison was invalid because both maps were unallocated; retained as diagnostic evidence, not a performance result.
