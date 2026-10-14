# Navigation demand before WASM campaign integration

The native Sabana/Mapungubwe seed-712 good-management campaign was traced for seven nights with the JS sector navigator. The observer only counted the native calls and did not alter their results. [Full trace](sabana-7-navigation-demand.json).

| End of night | Cumulative path calls | Region lookups | Connectivity checks | `setState` calls |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 419 | 69 | 1 | 6 |
| 2 | 879 | 126 | 2 | 13 |
| 3 | 1,404 | 199 | 3 | 22 |
| 4 | 2,012 | 494 | 7 | 32 |
| 5 | 2,704 | 596 | 27 | 39 |
| 6 | 4,819 | 1,176 | 338 | 45 |
| 7 | 6,687 | 1,569 | 558 | 61 |

The query profile is dominated by worker radius 0.28 (3,954 paths) and animal radius 1.1 (2,373 paths). Four other animal radii appeared. The 1.1-radius queries span approximately X 60–215 and Z −23–167, much larger than the initial farm. `workerNavigationView` was requested 1,545 times but returned the base navigator throughout this particular campaign; there were no distinct avoidance views. This does not establish that avoidance views are absent in other saves or biomes.

The trace supports a shared, persistent grid per movement profile, updated on actual topology changes. It argues against rasterizing one bounding rectangle around every observed point for each profile. Some `setState` calls may leave collision geometry unchanged; the trace does not classify them. The next core change should materialize sectors on demand, reuse them across nearby units and requests, and update only sectors touched by topology changes. The abstract graph must know whether an unexplored sector is *unknown* rather than treating it as blocked, so it never rejects an actually reachable route.

The synchronous [WASM facade](../../../src/world/hierarchical-wasm-adapter.js) is ready for controlled native-path probes with fractional endpoints. It is **not** wired into the campaign or production navigation. The current bounded-grid proof still scans its full rectangle during graph construction and refresh. Full campaign integration before lazy sectors would obscure this architectural cost instead of validating the requested design.
