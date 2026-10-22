# Persistent accepted-tile eligibility

QA candidate builds the underlay mask from all accepted anchors in currently cached resident coverage tiles. Camera-only selection changes check tile/group references and reuse the mask; tile invalidation/addition/removal or resident group replacement rebuilds it. It consumes existing renderer eligibility, not Engine memory or new navigation queries. A shared activation gate disables filtering when the draw capacity overflows, rather than claiming eligibility equals actual draw membership in that case.

This deliberately changes semantics from selected-list masks. Cached off-screen/previously seen tiles may contribute, while shader distance and terrain masks restrict visibility. Newly discovered tiles can still trigger construction; it is not a completely camera-independent preprocessing system. No production source/default change.

## Correctness and visual evidence

Node probe verifies50 unchanged checks without rebuilding, clear/replacement invalidation, overflow deactivation, resident group replacement and disposal. These are synthetic lifecycle tests, not a substitute for real construction/crop/water events.

Twelve real day/night frames, six cached/persistent pairs with exact camera/time/calls/triangles. Five pairs pixel-exact; remaining night game-view pair differs in one red channel of one pixel by1/255. The day game view was inspected; retained substrate/blade separation is visible. No captured console/GL errors. This fixture supports visual equivalence at these poses, not universal selected-mask equivalence.

25 R8 masks still use235225 data bytes plus equal scratch arrays, excluding additional JS/cache/driver storage. Capture end: persistent26 uploads/244634bytes versus selected92/865628bytes. However, persistent42 rebuilds across127 checks accumulated309.2ms wrapper CPU versus selected239.9ms, showing that cold/reinvalidated builds remain expensive. Loading schedules are not equivalent timing fixtures; do not claim a cold-build improvement.

## Intel UHD A/B/A/B, resident moving-camera fixture

Raw records and summary in `river-underlay-mask-persistent-cost-20261022`. Media1280x720, seed712, cached/persistent/cached/persistent,4-unit camera loop and wind,60 warmup +90 samples per phase. GPU and CPU/cadence passes separate. All720 GPU queries valid; exact per-frame cameras/draws/triangles; simulation unchanged; no GL/disjoint/pending errors. No concurrent tests/captures during timing. Chunk synchronization suspended identically after settling: no streaming/preparation latency claim.

| Phase/repetition | Selected CPU ms | Persistent CPU ms | Selected GPU ms | Persistent GPU ms | Selected interval ms | Persistent interval ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Day1 | 6.834 | 4.716 | 14.979 | 14.950 | 17.792 | 17.393 |
| Day2 | 5.992 | 4.733 | 15.111 | 15.086 | 17.681 | 17.651 |
| Night1 | 6.824 | 4.521 | 15.672 | 15.447 | 18.298 | 18.037 |
| Night2 | 6.014 | 4.781 | 15.672 | 15.670 | 18.291 | 18.471 |

CPU render submission improves1.233–2.303ms, with GPU nearly unchanged. Mean cadence improves in three comparisons and regresses .18ms in one; this is **not a consistent FPS improvement**. CPU p95 falls from8.6–10.5ms to6.3–6.5ms; complete GPU/cadence p95 remains in summary JSON. The benefit is removing recurring mask work, not reducing drawn vegetation or visual quality.

## Decision and remaining gates

Retain persistent eligibility as the preferred QA architecture. Do not reject the visual improvement because the current scene remains GPU-limited, but do not claim the total-frame goal is solved. Before native integration: real occupancy invalidation, rapid streaming and second-seed camera paths, overflow recovery/visibility/quality with this new helper, and cold-build cost. If rebuilding all cached tiles on a local event is too expensive, narrow updates to affected regions without adding per-frame object traversal.

## Reproduce

```powershell
node tools/experiments/test-selected-grass-mask-persistent-20261022.mjs
node tools/experiments/capture-river-underlay-mask-persistent-20261022.mjs
node tools/experiments/measure-river-underlay-mask-persistent-20261022.mjs
$env:WG_BENCH_OUT='docs/qa/global-visual-lab/river-underlay-mask-persistent-cost-20261022'
python tools/experiments/audit-canyon-native-composition-resident-cost-20261022.py
```

Vite on5190. Global six-biome art objective remains incomplete; main untouched.
