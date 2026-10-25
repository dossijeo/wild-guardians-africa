# Atomic Canyon handoff: continuous hole-coverage check

Source c91903812, opt-in horizonHandoff=atomic, seed 712, media, 1280x720, real active simulation, native 144 m longitudinal out-and-back camera, 40 seconds per phase. Night continues day state; these recordings are not a controlled performance A/B.

| Phase | Recorded frames | Frames missing/hidden inside adopted hole | Frames holding completed horizon | Maximum installed chunks |
| --- | ---: | ---: | ---: | ---: |
| Day | 1238 | 0 | 457 | 29 |
| Night | 1170 | 0 | 386 | 32 |

The coverage audit independently checks absent chunk keys against the recorded adopted region, then requires no missing/hidden groups and that deferred adoption was exercised. It does not inspect triangle coverage, material correctness or GPU shadow pixels. The path/execution audit also passes; console errors empty and final GL error zero. Per-frame GL calls are deliberately omitted to avoid disturbing scheduling.

Inspected both nine-image contact sheets: no large rectangular opening visible. Fine seam quality still needs temporal inspection; group presence does not prove absence of cracks. Full raw telemetry and sheets retained alongside summaries. Videos remain local in this capture directory.

No FPS, GPU, throughput or memory improvement is claimed. Retaining old plus incoming chunks raises transient resource occupancy; compare actual GPU allocations and timings before adoption. Force rebuilds, changes of quality, context recovery and world exit during held work remain required. Current review and normal game defaults still do not enable this option.

Reproduce with WG_CURRENT_REVIEW=1, WG_MOTION_SPARSE_GL=1, WG_COVER_QUALITY=media, WG_FIXTURE_BIOME=gran-canon, WG_HORIZON_HANDOFF=atomic, and a fresh WG_REVIEW_OUT; run capture-horizon-raised-motion-20261023.mjs, then audit-canyon-horizon-coverage.py and audit-horizon-raised-motion-20261023.py against that output directory.
