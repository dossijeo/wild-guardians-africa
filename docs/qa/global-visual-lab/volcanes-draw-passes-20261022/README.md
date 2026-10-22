# Effective draw accounting resolves the44-triangle difference

Run tools/experiments/audit-volcano-draw-passes-20261022.mjs. QA wraps renderer.renderBufferDirect for one captured frame at each stop, preserves the original call, and records its actual renderer.info counter delta. Same resident fixture/camera and192-unit excursion; no runtime edits, cache clears or timing claims. Structural state/GL checks pass.

Full-frame totals are103calls/603243triangles initially and103/603199 on return, including the one-triangle sky draw omitted by final-pass-only counters. Difference is exactly−44. Components:

| Component | Initial triangles | Return triangles | Difference |
|---|---:|---:|---:|
| Distant terrain |4016|4044|+28|
| Distant terrain seam |2208|2080|−128|
| Far impostor quads, opaque and blended |5116|5172|+56|
| Other draws |591903|591903|0|

Thus near geometry and other draw totals do not explain the discrepancy. The distant region sample changes. Source inspection finds FarRegionTracker initialized at the unsnapped initial camera position; later requests round to its96-unit grid. startInitialFarRegion uses that same unsnapped position for early loading. This is a concrete sampling-history hypothesis, now under QA test with aligned initial centers in both early loading and the eventual owner. Do not yet call it fixed. Raw material/object keys distinguish farGround and farGroundSeam, unlike the earlier callback-only ledger.
