# Native-sun biome matrix: all species, technical continuity

Latest candidate `8b8a931` refreshes a retained bank's requested LOD only after its replacement fence. The previous policy ignored changed LOD requests for an unchanged identity; a directed regression reproduces this. The earlier diagnostic for Sabana baobab `0:-6:-4` did not expose level: its resource prefix0 is the epoch, not LOD0, so it cannot establish a LOD mismatch for that tree. Forty-seven directed tests pass and the new regression fails with the old condition. The same-pose native check after the fix reports LOD2 in both banks, but the dither persists and renderer submissions are unchanged (65calls/718574triangles). Thus this fix is not an established remedy for that artifact. Movement and cost are still pending. Diagnostic-only `ecd5c3b` exposes the retained level directly; `d183251` adds an offline backdrop composition pilot without changing deployed atlases.

The current 120–160 m preset has completed **66 routes for 22 species across six biomes**, at seed 712, Mapungubwe, medium quality. Each species uses one deterministic tree ID through a daytime approach, a full-night orbit and a daytime lateral pass. Rendering revision is `a0fb5ce`; individual source commits are retained in the table and raw reports. Subsequent root animal grounding and QA/offline changes are not attributed to historical runs.

All 66 routes preserve exact logical state and finish with no render errors or WebGL errors. Target readiness descents, potentially visible descents and unknown descents are zero. The aggregate keeps **8,030 global descents**, all classified by individual tree bounds outside the camera frustum; full traces retain keys, resource epochs, transforms and packing.

| Biome | Species | Routes | Global descents | Source / report |
|---|---:|---:|---:|---|
| sabana | 4 | 12 | 1918 | [aef4b25](sabana-all-species-aef4b25/summary.json) |
| gran-rio | 4 | 12 | 2467 | [5afd8e2](river-all-species-5afd8e2/summary.json) |
| manglares | 4 | 12 | 1805 | [f8a58d1](mangrove-all-species-f8a58d1/summary.json) |
| volcanes | 4 | 12 | 1573 | [598aafe](volcano-all-species-598aafe/summary.json) |
| gran-canon | 2 | 6 | 59 | [3d416bc](canyon-all-species-3d416bc/summary.json) |
| desierto | 4 | 12 | 208 | [76dbc9b](desert-all-species-76dbc9b/summary.json) |

This is **technical continuity acceptance for these paths only**, not art acceptance or an FPS improvement. Other qualities, elevation and restoration on the finalized materials still need review. Distant dither and the flat washed-ground band remain visible limits. The latest historical cost comparison still added GPU cost, so normal gameplay remains OFF and no PR is proposed yet.

Four active atlas pairs estimate 42.67 MiB RGBA+mips (two pairs in Canyons: 21.33 MiB); each active backdrop estimates 5.33 MiB. Owned native banks are bounded and reported separately. These estimates and renderer counts are not driver memory measurements. Instrumented QA and concurrent long CPU campaigns preclude using path speed as gameplay FPS. Night images are recorded in each directory; Canyons night image is the final pose after an explicit phase change, with `night=1`, rather than an orbit capture. Desert's first load was closed before any path to yield a coordinated GPU window; the later arrival/path reports come from the new scene.

The earlier limited routes and limitations below remain historical evidence.

# Historical initial routes

Gran Río on57710f8/mainc18d119: approach, orbital and lateral completed20s QA paths. Exact logical final state, target drops0, GL/render errors0. All global descents counted without trace cap; potentially visible0 and unknown0.

Day/night arrival screenshots share139.10m pose and true preloaded3D handoff before physical chunk. Orbit briefly switched to night near its end while waiting for completion, then initial time restored before ending; preserve this limitation rather than treating it as a pure-day path. Lateral starts and ends at night and has state equality.

Frame counts include pausedholding time; root CPU snapshot benchmark/build overlapped some visual sampling. No GPU/CPU/FPS timing claim. Four atlas pairs42.67MiB/backdrop5.33MiB plus bounded ownedbanks (actual rowcount/estimates in reports). No full six-biome acceptance yet, no normal gameplay activation.


Manglares on the same 57710f8 source: approach, pure-night orbit and initial/day lateral complete20s; logical state exact, target drops0, potentially visible/unknown global descents0, GL/errors0. Counts are uncapped in the summaries. Day/night arrival uses identical camera. These routes precede the context-cancellation fix; the separate restoration counterexample and successful d2136d6 rerun are in ../far-context-cancel-review. The grey night horizon band and fairly flat washed far ground remain art acceptance limits; no FPS claim.
