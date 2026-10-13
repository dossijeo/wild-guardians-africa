# C++/WebAssembly navigation comparison (experimental)

This branch contains two C++ search cores in the same 21,901-byte WASM module:

- `nav_route`: 12-cell sectors, flood-filled local components, an abstract inter-sector graph, then local routes.
- `nav_route_flat`: eight-neighbor A* over the same physically sampled grid. This represents the former flat search topology, **not** the entire old JavaScript target selector, cache, or planner.

The JavaScript adapter batches a passability and edge raster into WASM. The flat variant additionally samples diagonal edges. Movement remains in the game's JavaScript engine. These are isolated proofs; the production `Navigation` entry points do not yet use the WASM module.

## Measurements

Measured on the same host with AB/BA ordering. Times below include each variant's required raster preparation, module instantiation, and first batch of routes. Repeated values are separate AB/BA runs. The detailed per-phase results and memory observations are in [Gran Cañón](canyon-day7-wasm-comparison.json) and [closed perimeter / breach](closed-breach-wasm.json).

| Scenario | JS sector prototype | C++/WASM hierarchy | C++/WASM flat A* |
| --- | ---: | ---: | ---: |
| Gran Cañón day 7: setup + 94 cold queries | 1,033–1,317 ms | 435–492 ms | 981–1,003 ms |
| Gran Cañón day 7: 94 warm queries | 129–164 ms | 0.63–1.14 ms | 20.8–21.1 ms |
| Closed 100-crop farm: setup + 24 cold queries | 392–483 ms | 119–135 ms | 183–228 ms |
| Closed 100-crop farm: 24 warm queries | 83–94 ms | 0.12–0.25 ms | 10.2 ms |
| After two wall modules are destroyed: 24 cold routes | 8.8–14.4 ms | 0.88–1.35 ms | 1.42–1.47 ms |

All three variants rejected all 24 outside-to-crop routes through the intact perimeter and found all 24 after the physical breach. Every returned segment passed the native physical collision check. On the day-7 snapshot, all variants found the same 28 short local routes; 66 crop requests remained blocked. That snapshot does **not** test a reachable distant crop or real-time unit motion.

The old flat A* pays for diagonal-edge sampling, which is part of its route model. Its longer setup is a real total-cost disadvantage in this implementation, but the query comparison also favors the hierarchy on a common already-built raster. The hierarchical core uses four-way routes; the flat core permits diagonals, so route shapes and lengths need not match.

## Decision and limits

WASM is promising on these bounded cases, and the hierarchical core currently beats the C++ version of the old flat A*. This is **not** enough to choose a production navigator. The current C++ proof rasterizes a finite rectangle up front; the game's world needs lazy chunks and topology updates. A local edit rebuilds affected sector components but still rebuilds the abstract graph globally. Worker gates, species-specific profiles, multigoal targeting, and full integration with animal/worker motion remain to be implemented and measured. Initial raster preparation is a synchronous 0.12–0.48 second cost in these cases, which would be a visible stall if placed on the gameplay thread without staging.

The JS prototype completed a 14-night Sabana campaign in 388.7 seconds wall time before the latest crop-index changes. This is not directly comparable with the historical 115.1 seconds of accumulated `Game.tick`, and it does not demonstrate a sustained improvement. No 30-, 60-, or 100-night campaign has run with the WASM core. Do not merge or claim production readiness from these microbenchmarks.

Next validation: build lazy, per-profile raster updates and gate portals; run physically valid actor movement with the new planner; compare sustained 14-night campaigns against the original navigator, then progress to 30/60/100 nights only if the shorter campaigns remain correct and faster. Retain both C++ algorithms as experimental controls until that comparison is complete.
