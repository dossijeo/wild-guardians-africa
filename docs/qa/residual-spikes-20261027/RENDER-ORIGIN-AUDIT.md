# Render-origin synchronization audit (2026-10-27)

Scope: current production sources at 80f797393; no runtime intervention or performance claim.

Confirmed call chain: `withRenderOrigin` explicitly calls `scene.updateMatrixWorld(true)` after translating a nonzero origin; `WebGLRenderer.render` subsequently calls `scene.updateMatrixWorld()` when automatic updates are enabled (r180 lines 1536–1540). The zero-origin fast path does NOT perform the first update, so any candidate must count actual applicability and never suppress its only synchronization.

The interval is not mutation-free. `drawWorldFrame` calls destruction preparation, all VFX preparation, then `vfxLibrary.updateWorldLights`. In `vfx.js` the latter changes pooled PointLight positions after the origin traversal. A blanket suppression of Three's update can therefore render stale light transforms. Destruction preparation additionally refreshes building subtrees and opening matrices. Depth and smoke use their own render calls, and shadow staging owns detached transforms. The existing final origin restoration is necessary for global-coordinate picking and callbacks and must remain, including exceptions.

The earlier depth-to-color reuse candidate had zero applicability in the ordinary continuous-streaming trial. This new hypothesis concerns origin-to-first-world-render overlap, not that rejected intervention. Before implementing it: measure nonzero-origin applicability; inventory all mutations between synchronization and each main-scene draw; establish targeted updates for changed lights/objects; verify moving actors, spell lights, destruction, depth, shadows and failure restoration. Do not use global matrix freezing. Compare whole-frame and chunk throughput, not saved traversal time alone.

Existing sampled profile attributes 936.486 ms self time to updateMatrixWorld over 41.753 seconds, with 412.909 ms nearest caller withRenderOrigin and 316.884 ms renderer. These are cumulative sampling attribution, not a measured per-frame saving. Evidence is in current-stream-profile/FINDINGS.md. No production change is justified by this audit alone.
