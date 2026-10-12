# Day 13 native approach-search diagnostic

This is a copied checkpoint replay from `pilot-v128-day13-split-entry/checkpoint-state.json.gz` (SHA-256 `7b9adb178ee14446943cf4801545a7b20129c45330b837e04ca2808bc07ce1fb`). It advances the real game simulation and raid navigation from 390 to 455 seconds without virtual-player decisions. It is a CPU diagnostic, **not** a campaign outcome, rendering benchmark, or approval to start the 100-night run.

At the raid entry tick (450 seconds), the original search repeatedly probed plants behind a closed defense. The selected targets were eventually walls. A native exhaustive path search already populates `closedRegions`; the candidate uses those certificates to reject a crop only if every possible 32-sample service point is non-walkable or its possible integer-grid connectors are in certified components that do not contain the animal. Any unknown connector or direct clear segment falls back to the existing path search. This changes no animal count, attack damage, radius, player policy, economy, or crop resistance.

| Replay | Failed/total path calls at entry | Path-call CPU | Largest game tick | Final serialized state SHA-256 |
| --- | ---: | ---: | ---: | --- |
| Baseline trace | 18,566 / 18,584 | 8,118 ms | 10,013 ms | `9868e1dd5abf2c93468c467ea01091f4087f7a0405863867dc7003f2aa97c62e` |
| Conservative ring certificate | 736 / 754 | 499 ms | 2,777 ms | `9868e1dd5abf2c93468c467ea01091f4087f7a0405863867dc7003f2aa97c62e` |

The ring proof fired 558 of 579 times. Total `segmentClear` calls still reached 25,694 (1,732 ms), so the peak remains unacceptable for a rendering frame. The improvement is real but incomplete. The targeted navigation/raid suite passed 53 tests, and the new conservative-certificate tests passed 2 tests. The one-checkpoint state hash establishes parity only for this replay; other biomes, damaged gates, shields, and save/reload still need native regression before integration. Preserve the trace JSONs and negative reports alongside this note.

The next phase trace attributes 1,640 ms to the 25,118 native coarse segment checks and 822 ms to 122,749 terrain validations (nested timings). A trial that deduplicated the 3×3 connector neighborhoods increased the peak to 2,951 ms, so it was reverted; its trace is retained as a negative result. The remaining route work must be reduced or distributed across rendering frames before the long campaign is resumed.

A later trial added a circumscribed-circle broad-phase test before the exact wall sweep. It preserved the checkpoint state and passed 17 wall/navigation tests, but the largest tick was 2,777 ms, indistinguishable from the accepted candidate's 2,777 ms. It was also reverted. The remaining cost is not solved by a local wall-shape shortcut; the next experiment should target the number or scheduling of full service-point checks, with deterministic raid behavior validated separately.
