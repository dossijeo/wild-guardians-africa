# Canyon shore construction: skip unused boundary extraction

Canyon's boundaryDistance already returns constant 4 to avoid false horizon seams. The previous code nevertheless traversed all triangle edges, formatted endpoint strings, counted boundary edges and built bins. The change skips that traversal only when field.canyon is true. Height sampling, dimensions, packed bytes and shader remain unchanged. Other biomes still compute real boundaries.

Native real-game ABAB, seed 712, medium 1280x720, day/night river round trips. Same per-build instrumentation in both arms. Day totals include initialization, night a warm second traversal. Timing covers map preparation, not GPU or frame time.

| Run | Phase | Builds | Total ms before → after | Max build ms before → after |
|---|---|---|---|---|
| 1 | Day | 24 | 333.3 → 252.1 | 62.9 → 52.4 |
| 1 | Night | 15 | 231.4 → 199.0 | 56.8 → 50.3 |
| 2 | Day | 24 | 334.6 → 245.4 | 63.6 → 53.2 |
| 2 | Night | 15 | 234.5 → 196.5 | 56.0 → 52.1 |

Savings: 81.2–89.2 ms total day, 32.4–38.0 ms night. Forty real captures: all twenty corresponding before/after RGB pairs exact; no browser/WebGL errors. A numerical test compares packed maps with the previous QA algorithm at positive/negative chunk origins and passes byte-for-byte. This is a justified construction optimization, not evidence of higher FPS. Individual builds remain around 50 ms and require further profiling.

Retain. Next isolate the remaining sampling/packing cost without reducing quality. Reproduce `node --test tests/canyon-shore-build.test.js`; Vite 5190; `node tools/experiments/profile-canyon-shore-build-skip-20261022.mjs`, then `python tools/experiments/audit-canyon-shore-build-skip-20261022.py`.
