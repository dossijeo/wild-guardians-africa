# C++/WebAssembly navigation comparison (experimental)

This branch contains two C++ search cores in the same WASM module (24,502 bytes after adding native worker portals):

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

The initial WASM build reserved roughly 16.9 MB of linear memory in these fixtures. Multiple independently instantiated profiles would multiply that cost, so production integration must share or bound instances and measure peak memory. RSS deltas in the individual trials are noisy because of JavaScript GC and should not be treated as reliable peak-memory measurements.

The later build lowers initial linear memory to **4 MiB** with growth enabled. The [Gran Cañón replay](canyon-day7-wasm-low-memory.json) stayed at 4 MiB for each WASM variant and preserved all route outcomes; hierarchical grid setup remained around 0.43–0.46 seconds. Larger campaign bounds may trigger growth. The [seven-night navigation-demand trace](integration-demand.md) shows why lazy sectors are still necessary before committing to one instance per profile.

A matched seven-night Sabana seed-712 campaign provides a direct sustained warning: [the original navigator at `45814718`](sabana-7-baseline.json) completed in **76.72 s**, while [the JS hierarchical prototype based on that revision](sabana-7-js-prototype.json) took **111.09 s** (45% slower). Both completed seven nights. Their valid routes led to different farm states (127 versus 131 living plants, 157 versus 121 deliveries, and 0 versus 4 destroyed plants), so this is a practical campaign comparison rather than an identical-workload microbenchmark. The WASM proof is not used by that campaign. It must be integrated and retested before selecting it for the game.

## Two-pass raster experiment

The adapter now samples every cell's passability once, then builds physical edge masks from that stored raster. The bounded 24 × 24 regression fixture verifies exactly 576 passability samples at initialization and nine for a one-cell update, including the necessary neighbor ring. The first [Gran Cañón repeat](canyon-day7-wasm-two-pass.json) still takes approximately 0.45–0.50 seconds for hierarchical setup and queries; the [perimeter repeat](closed-breach-wasm-two-pass.json) is roughly 0.09–0.12 seconds. These timings vary with host load. The change removes redundant geometry queries and preserves every route in the tested fixtures, but the measured runtime benefit is not yet strong enough to claim a substantial overall speedup.

## Native worker gate

The C++ graph now accepts explicit portal connections with fractional physical waypoints. Both C++ variants found all 24 worker routes through a native automatic gate, while an animal of raid radius remained blocked. Every returned segment passed `Navigation.segmentClear`; removing the gate also removed both variants' routes. The [ABBA gate benchmark](worker-gate-wasm.json) measured 215–248 ms for hierarchical setup plus its first 24 routes and 375–401 ms for flat A*. On an initialized grid the queries were all below 3.3 ms and close enough that this fixture alone does not distinguish their steady-state cost. The larger setup cost for flat A* includes its diagonal-edge raster.

Sequential repeats with the portal-capable binary preserve the earlier ranking: [Gran Cañón day 7](canyon-day7-wasm-portals.json) required 446–460 ms for hierarchical setup plus 94 cold queries, versus 967–970 ms for flat A*. In the [closed-perimeter fixture](closed-breach-wasm-portals.json), setup plus 24 rejected routes required 111–118 ms versus 160–173 ms. Concurrent trial runs were overwritten by these sequential repeats because host contention distorted their timings. Both algorithms still found all 24 routes after the physical breach, with no invalid returned segments.

The core now also unions sector components along physically sampled graph edges and gate portals, then exposes a shared region ID to target selection. On the [Gran Cañón crop-group replay](canyon-day7-wasm-connected-regions.json), 178 living crops resolved into 44 logical groups in both the JS and WASM implementations. Region lookup took 5.2–6.0 ms in WASM versus 42.9–60.4 ms in JS, including the physical endpoint check. Grouping by local sector alone had incorrectly produced 50 groups; that intermediate result remains in [the earlier diagnostic](canyon-day7-wasm-region-groups.json). The union is a conservative weak-connectivity grouping; route planning still checks directed edges and physical movement.

## Full endpoint routing and shared region rejection

The WASM QA facade now accepts fractional world coordinates synchronously and validates every returned segment with the native collision routine. Its first [Gran Cañón full-route replay](canyon-day7-wasm-facade.json) revealed that 66 blocked crop requests triggered repeated connector-pair searches: flat A* spent 1.22–1.25 s on 94 full requests, versus 38–43 ms for the hierarchy. That diagnostic is retained.

Compiling the module once before the replay took about 0.6 ms on this host; [the compiled-once run](canyon-day7-wasm-compiled-once.json) therefore confirms that physical raster preparation dominates setup rather than repeated module compilation. This is a host-specific measurement, not a browser or mobile startup guarantee.

Before either core runs A*, the facade now compares the **shared connected-region IDs** of physically valid endpoint connectors. Different weak regions cannot have a directed path. In the [repeat with this common prefilter](canyon-day7-wasm-region-prefilter.json), both cores still returned the same 28 local routes and rejected the same 66 blocked crop requests, with no invalid segments. The full-route batch cost 18.7–19.2 ms for the hierarchy and 10.7–12.1 ms for flat A*. On the [native closed-wall/breach replay](closed-breach-wasm-facade.json), both rejected all 24 closed routes in about 1–2 ms and found all 24 after the breach in about 1–3 ms. These query differences are smaller than flat A*'s additional 50–500 ms diagonal-raster initialization cost in the tested scenes. A sustained run with real route frequencies and topology changes is still needed to choose the faster total pipeline.

Next validation: build lazy, per-profile raster updates and gate portals; run physically valid actor movement with the new planner; compare sustained 14-night campaigns against the original navigator, then progress to 30/60/100 nights only if the shorter campaigns remain correct and faster. Retain both C++ algorithms as experimental controls until that comparison is complete.
