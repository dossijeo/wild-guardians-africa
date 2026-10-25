# Water and mud-edge preparation attribution

Intel UHD, 720p, medium/day, integrated fixed512; same 144 m out-and-back diagnostic, 30 warmup / 240 recorded. WG_PREP_DETAIL=1 rewrites named imports in the served scene module to transparent timed wrappers. No production code or visual settings changed. Preparation timing records synchronous CPU only, inclusive of nested calls.

30 terrain calls: total 552.4 ms, mean 18.41, max 38.2. Of that, bindMangroveMudEdges accounts for 164.6 ms across 30 calls (5.49 mean, 9.6 max). prepareNaturalWater accounts for 159.9 ms across 18 water-bearing chunks (8.88 mean, 22.9 max). prepareMangroveBank adds 30.5 ms across those 18 calls (1.69 mean, 5.2 max). Mud patch construction is another 91.4 ms total. These explain most of the previously unattributed terrain work, not necessarily all end-to-end streaming stalls.

Code inspection: prepareNaturalWater reconstructs boundary edges, spatial bins and a height/distance texture per water geometry. bindMangroveMudEdges builds a formatted-coordinate terrain lookup, interpolates attributes and computes nearest contour distances for unique mud vertices. Both are deterministic visual preparation candidates; no reduction in fern density, shader quality or cached material resolution is justified by this evidence.

Next implementation should preserve exact outputs where possible, then verify byte/image equivalence and whole-frame streaming impact. No optimization is claimed yet. Cache generation remains separately measured at ~0.35 ms CPU / ~0.96 ms GPU. Keep fixed512 and the approved green ground, dynamic lighting and shoreline appearance.

Reproduce with WG_PREP_DETAIL=1, WG_STREAM_PATH=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=preparation, WG_SAMPLES=240, WG_WARMUP=30, WG_REVIEW_OUT=<new directory>; run tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. Instrumentation is diagnostic, not an acceptance benchmark.
