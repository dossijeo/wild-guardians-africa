# Wild Renderer: decision after persistent/event-driven prototype

**Recommendation: retain the production Three.js/WebGL2 renderer. Keep this
module experimental; do not proceed to native GLES submission on this evidence.**

The hypothesis is partially supported: persistent data and events remove copies
and repeated registry work, and real crop events can update one batch while
retaining the other 172. A consistent improvement in total frame time has not
been demonstrated. This is not proof that a more complete native grouper could
never help, nor a reason to discard the approved graphical variants.

## Scope correction after user review

The previous comparison did not include an uncull control. It cannot close the hypothesis of eliminating the CPU penalty of culling with a fuller native preparation pipeline. The new [ABCABC control](CULLING-CONTROL.md) confirms the GPU and cadence benefit of culling relative to no per-instance culling. WASM retains the triangle reduction, but still performs about 48 group uploads per moving frame and leaves most grouper work outside the moved kernel. Continue investigating effective-selection invalidation and the remaining JS grouper; the production renderer remains unchanged meanwhile.

La [variante posterior de salida efectiva](EFFECTIVE-SELECTION.md) reduce las subidas de grupos de 48 a 11,4 por frame. Se conserva como candidata; quedan validación con streaming/eventos, variación temporal y preparación JS pendiente.

## What was built

- Independent Emscripten C++/WASM transform, sphere-culling and matrix-packing
  module; Three.js still submits all graphics commands.
- Original adapter, persistent-data adapter, event-based resource lifetime,
  packed Engine prop input, and confirmed-event suppression invalidation.
- Compact 40-byte Engine records copied at chunk delivery. Native pointers are
  not retained across chunk selection or memory growth. The modules have
  independent memories and allocators.
- QA routes only. No production simulation, navigation, balance or renderer
  imports were changed. The stable branches and visual-lab branch are separate.

## Findings

| Question | Evidence and limit |
| --- | --- |
| Can packing preserve existing culling? | Ordinary Sabana comparisons have identical retained day/night captures and per-frame draw/triangle counts. Earlier runs did not retain each repeated screenshot; the harness now does. |
| Can input copies be reduced? | Persistent data reduces measured writes from roughly 49 KB/frame including descriptors to 1.2 KB/frame. This is not a complete JS/WASM traffic or GPU-upload measurement. |
| Can events eliminate the registry scan? | Registry CPU falls from 0.054–0.064 ms to 0.005–0.006 ms. |
| Why does input preparation remain around 0.12 ms? | Group collection, entry iteration, LOD/fade revision checks, pointer descriptors and world-transform checks remain in JS. Bulk-copy elimination alone does not remove these operations. The cost has not been proved irreducible. |
| Does Engine memory help? | Native prop registration avoids visiting JS instance records. Real event tests exposed and corrected a missing visual invalidation when a suppression Set changed without changing identity. |
| Is the full frame faster? | Not consistently. Ordinary paired group CPU improves about 8–15%; dense fixed-residency timing has mixed results, including a slower candidate night block. |
| Is dense rendering equivalent? | With 49 fixed resident chunks, all camera/draw/triangle sequences match. Tiny image differences remain, also reproducible within the original variant; strict image equivalence is not established. |
| Is streaming faster? | Instrumented request-to-install means are 139.025→130.910 ms and 135.430→113.375 ms, with identical multisets of 20 installed chunks and no cancellations. This is latency, not FPS or first presentation. Native build duration also varies although its algorithm is unchanged, so attribution remains limited. |

The stress fixture contains 300 crops, 24 workers, 16 animals, 3 additional
buildings and 40 walls. It is a renderer fixture, not a naturally progressed
campaign. The real crop-command test uses a peaceful version without animals
and restores UI pauses immediately after synchronous commands.

## Cost and scope

Testing used the Intel UHD/D3D11 ANGLE backend documented in the rendering
datasets, 1280×720 and low quality. CPU, GPU queries and render-entry cadence
were measured separately. The streaming run instruments the main-thread builder
and installation callback; it does not measure first displayed pixels.

The module reserves a fixed 64 MiB linear memory. Allocation counters track
module arenas, not physical residency, JS heap or VRAM. Packed snapshots and
native matrices currently coexist with JS/Three representations needed by LOD,
obstruction and shadows. Full memory accounting and a production lifetime audit
remain limitations. Eight targeted tests pass, but do not replace campaign or
six-biome validation.

The conditional C++ GLES variant was not implemented: a robust full-frame gain
in the first architecture was its prerequisite. Emscripten can bridge GLES3 to
WebGL2, but that alone does not eliminate browser interop or Three.js GL-state
ownership concerns (see the source links in README.md).

## Reproduction and evidence

Build with `tools/build-wild-renderer.ps1`. Run the six `wild-renderer*.test.mjs`
test files (eight test cases). Start Vite on port 5192, then use
`tools/experiments/measure-wild-renderer.mjs` with the documented environment
switches. Output paths must be fresh to preserve earlier evidence.

- `abba`: JS culling versus initial WASM, ordinary scene.
- `incremental-abab`, `events-abab`, `engine-abab`: successive bounded comparisons.
- `fixed-dense-events-abab`: fixed-residency dense comparison, strict image gate fails.
- `dense-image-repeatability`: separate images for each repetition, including A/A.
- `engine-event-mutations-verified`: actual crop events and source-retention checks.
- `streaming-events-abab`: request-to-install latency, audited separately from FPS.

`EVENT-INTEGRATION.md` records excluded runs, corrections and outstanding
limitations. Negative or invalid comparisons have not been relabeled successes.
