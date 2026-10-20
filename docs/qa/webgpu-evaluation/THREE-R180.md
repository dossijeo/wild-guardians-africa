# Three.js 0.180.0: audit of the available WebGPU path

This audit reads the installed Three.js 0.180.0 sources. It does not establish a performance advantage or authorize a migration decision by itself. Current online documentation can describe newer APIs.

## Renderer and compatibility

`src/renderers/webgpu/WebGPURenderer.js` provides a WebGPU backend by default and an automatic WebGL2 fallback. `new WebGPURenderer({forceWebGL:true})` explicitly selects that fallback. After `await renderer.init()`, inspect `renderer.backend.isWebGPUBackend`: `renderer.isWebGPURenderer` identifies the renderer abstraction, not the backend actually running.

The useful comparison has three arms:

1. Current GLSL materials with WebGLRenderer.
2. Equivalent TSL materials with WebGPURenderer forced to WebGL2.
3. The same TSL materials with the WebGPU backend.

The first comparison reveals differences from rewriting materials and changing renderer infrastructure; the second isolates the backend more closely. A faster arm with missing shadows, different geometry or simpler lighting is not a performance win at equivalent quality.

`Material.js` documents `onBeforeCompile` as WebGLRenderer-only. `ShaderMaterial.js` likewise restricts ShaderMaterial to WebGLRenderer. The WebGL2 fallback of WebGPURenderer does **not** preserve existing custom GLSL or shader-chunk patches. NodeLibrary can convert supported ordinary materials, but that does not reproduce AfricanToon's modifications.

A common TSL material implementation with CPU selection on fallback and optional GPU selection on WebGPU is feasible. Maintaining two complete artistic renderers is not intrinsically required, but the initial material translation is substantial.

## APIs present in r180

- Imports from `three/webgpu` and `three/tsl`.
- `WebGPURenderer`, `MeshBasicNodeMaterial`, `InstancedBufferGeometry`, instanced attributes.
- `positionNode` and `fragmentNode` for custom vertex deformation and lighting.
- Texture LOD, explicit texture gradients, derivatives, loops and depth comparison sampling in the corresponding node builders. POM is not inherently unavailable; it requires translation and visual validation.
- `Fn(...)().compute(count)`, `renderer.compute()` after initialization, and `computeAsync()`.
- `storage(...)`, `instancedArray(...)`, `instanceIndex`, storage element access.
- `IndirectStorageBufferAttribute` and `geometry.setIndirect(...)`.
- WGSL atomic storage operations for compaction counters.

Keep the original grass module arrays, density, visible distance, wind formula and LOD criteria identical before adding GPU selection. Replacing the grass lighting with a generic material would change the experiment.

The local r180 option for intermediate color precision is `colorBufferType`; current documentation calls a related option `outputBufferType`. Do not copy newer API names without checking the local implementation.

## Compute and fallback limitations

`WebGLBackend.compute()` implements a restricted compute path using transform feedback. `GLSLNodeBuilder` declares `storageBuffer:false`. It is not a general fallback for atomics, arbitrary storage writes, workgroup algorithms or indirect draw compaction.

`IndirectStorageBufferAttribute` explicitly requires WebGPU. WebGPUBackend uses `drawIndirect` or `drawIndexedIndirect` when the geometry has an indirect attribute.

One suitable prototype is GPU selection over the same immutable, resident candidate data that the CPU selector uses, with the same frustum and distance predicates. GPU-generated counters and selected IDs must be validated against CPU results outside the measured interval. Hiding unwanted vertices while submitting every candidate is a different workload and must be reported as such.

**Indirect draw statistics caveat:** WebGPUBackend updates `renderer.info` using CPU-side draw parameters even for an indirect draw. Its triangle count does not establish the actual compacted GPU instance count. Read the counters separately for audit.

## Timestamp and statistics caveats

Construct with `trackTimestamp:true`. After initialization, verify actual timestamp feature availability rather than assuming it. The GPU backend uses optional `timestamp-query`; the fallback uses `EXT_disjoint_timer_query_webgl2`.

`renderer.resolveTimestampsAsync('render')` and `resolveTimestampsAsync('compute')` report separate millisecond totals. Render duration sums instrumented passes; it does not automatically include transfers, all queue idle time, presentation or CPU work.

The r180 query pools can return their previous value when no new queries are available or resolution fails. The GL pool also returns its previous value on disjoint. A returned number alone is therefore not proof of a fresh, valid sample. Monitor disjoint/errors and track query issuance and completion explicitly.

`Backend.getTimestampUID()` uses context identity and `frameCalls`. Accumulating multiple frames while resetting per-frame counters can reuse IDs in the query-offset map; the GPU pool sums the retained map entries. Do not accumulate N frames and divide the resulting duration without checking this behavior.

Resolving each frame simplifies attribution but awaiting readback serializes CPU/GPU work. Use a separate instrumented run and interactive frametime run, or an explicit nonblocking query ring. CPU submission measurements must exclude asynchronous timestamp resolution.

`renderer.info.render.drawCalls` is the draw counter in the new renderer; `render.calls` counts render invocations. `info.memory` exposes resource counts, not VRAM bytes. Byte totals calculated from buffers and texture formats are estimates and should be labelled accordingly.

Chromium has documented timestamp quantization for security. Inspect the actual browser/features and measured precision; historical experimental flags are not evidence that the current browser needs those flags.

## Sources

Primary implementation: installed package `node_modules/three`, version 0.180.0:

- `src/renderers/webgpu/WebGPURenderer.js`
- `src/renderers/webgpu/WebGPUBackend.js`
- `src/renderers/webgl-fallback/WebGLBackend.js`
- `src/renderers/common/Backend.js`
- `src/renderers/common/Info.js`
- `src/renderers/common/IndirectStorageBufferAttribute.js`
- `src/renderers/common/nodes/NodeLibrary.js`
- `src/renderers/webgpu/utils/WebGPUTimestampQueryPool.js`
- `src/renderers/webgl-fallback/utils/WebGLTimestampQueryPool.js`
- `src/materials/Material.js`
- `src/materials/ShaderMaterial.js`

Official references, checked during the investigation:

- [WebGPURenderer documentation](https://threejs.org/docs/pages/WebGPURenderer.html)
- [Three.js Shading Language specification](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)
- [Chromium timestamp quantization announcement](https://developer.chrome.com/blog/new-in-webgpu-120)

The existing version is sufficient to start a practical parity prototype. An upgrade is not a prerequisite, and changing only the renderer constructor cannot preserve the existing game's appearance.

## Executable compute smoke

`tools/webgpu-evaluation/compute-probe.js` exports
`runComputeProbe(renderer, { candidates, cameraPosition, farDistance, samples, warmup })`.
`candidates` is an optional Float32Array of `(x,y,z,height)` records; omitting it selects an explicitly synthetic, deterministic grid of 32,768 records.

The TSL probe resets four indirect draw arguments, compacts selected IDs using an atomic counter, and compares sorted GPU IDs with the CPU selector at checkpoints. Both selectors use horizontal squared distance only. Readback audits occur outside submission timing. No draw is issued, so this is an early correctness and overhead probe, not evidence of a game-level rendering improvement.

With Vite serving this worktree on port 5294:

```powershell
node tools/webgpu-evaluation/compute-smoke.mjs
```

`WG_WEBGPU_URL`, `WG_COMPUTE_OUTPUT`, `WG_COMPUTE_SAMPLES` and `WG_COMPUTE_WARMUP` override the runner defaults. The smoke uses 2 warmup dispatches and 8 measured dispatches. The recorded `compute-smoke.json` passed all four set-equality audits, with 12,864–12,872 selected IDs, valid indirect argument layouts, and no browser errors. This validates compilation and correctness only.

Some timestamp results in this tiny workload are zero at the browser's timing resolution. This does not establish zero GPU cost and must not be converted into a speedup claim.
