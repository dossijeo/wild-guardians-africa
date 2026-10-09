# Current-main versus interactive loading: native ABBA

Root measured the real native Continue flow on 2026-10-09, in A1/B1/B2/A2 order. A is immutable main `d6c4adfc19f9cfc0db6f5d75fcbac4901f80ee6b`; B is feature runtime `41f57d037d79d4a2f5925b04bb77a2f926279e25`. Both contain the authored V4 crop assets. Private exports used identical read-only receipt instrumentation attached to the existing application RAF, without an extra loop, GPU queries, renderer wrappers or per-frame report serialization. Production defaults remained unchanged.

Each arm imported and verified the same day-one Sabana/Mapungubwe save through its BrowserSaveRepository, before timing. Snapshot SHA-256: `7bd6dbc14d0962b37931d21869c658a827a55a0c43f72c335c9af1481c4c0fdb`; slot `loading-v4-controlled-712`, seed `712`, zero crops. Timing starts at the trusted native iframe Continue click, includes real save loading and ends after camera restoration/final world draw. World readiness is measured separately from the feature's cinematic. Viewport: 1280×720. Cache retained and uncontrolled; no fully cached or cold-cache claim. Local CPU/GPU work was reserved during the four arms.

| Arm | Click to world ready | Click to controls | Ready to controls | Largest existing RAF interval | Intervals >50 / >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 | 7863.3 ms | 7864.5 ms | 1.2 ms | 1197.2 ms | 8 / 4 |
| B1 | 12608.6 ms | 16632.4 ms | 4023.8 ms | 99.7 ms | 7 / 0 |
| B2 | 13350.7 ms | 17383.5 ms | 4032.8 ms | 99.7 ms | 4 / 0 |
| A2 | 7786.0 ms | 7787.2 ms | 1.2 ms | 1131.0 ms | 6 / 4 |

All four reports finished without errors, captured trusted clicks and the exact snapshot hash, and reached the normal HUD. Preparation of the feature diorama during the menu completed before the measured Continue click (B1 1878.4 ms; B2 1954.6 ms). This is separately disclosed work, not subtracted from measured loading or silently claimed free. All temporary tabs were closed and viewport override reset.

Readiness is slower by 4745.3 ms (60.35%) in AB and 5564.7 ms (71.47%) in BA. Both pairs exceed the declared rejection threshold of more than 5% and 500 ms. The requested cinematic explains roughly four additional seconds after readiness; it does not explain the readiness regression. Scheduling improves substantially, with largest observed intervals falling from over one second to about 100 ms. These are RAF scheduling measurements, not GPU frame timings or statistical equivalence. No physical peak RAM/VRAM conclusion follows.

The user accepts a practical compromise around 50–60 ms pauses and wants to avoid extending local loading. The next candidate must reduce redundant cooperative waits while preserving genuine resource readiness, shader warming, scene ownership and responsive rendering. Do not promote the current result as accepted, erase negative arms, shorten the cinematic to disguise readiness cost or rerun unchanged code until a favorable sample appears.

Raw reports, console logs and root summary are retained by the feature owner under `docs/qa/interactive-loading-development/current-main-v4-abba-root/`. The adjacent readiness protocol and private manifests disclose source inventories and hooks. An earlier incomplete private export omitted the statically imported GPU helper and failed before application startup; that negative pilot was retained, exact committed helper bytes were added to both exports, and HTTP module graphs passed before these arms. The trusted-click observer was corrected for the native iframe before timing. Neither correction changed production runtime.

Full feature CI `37914538279` at `f2adc0b2211165dad0bfbd4a3540ae6c5bc0ce68` passed 3681 tests, build and itch package checks. That audit-only commit preserves runtime `41f57d03`; CI success does not override this performance gate or establish completion of the remaining loading compatibility/lifecycle QA.
