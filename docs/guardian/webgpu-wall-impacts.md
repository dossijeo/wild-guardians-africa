# WebGPU wall impact presentation

The WebGPU world now consumes `materialVfxPlans`, the same confirmed `AnimalLogicalHit` plans used by the existing wall impact presentation. Wood, adobe and stone impacts reuse the native particle composition, shared VFX atlas, ground projection and simulation clock. Shielded hits do not create a wall impact effect. The existing WebGL implementation is unchanged and there are no simulation or collision changes.

An experimental `includeWallFragments` option draws rigid splinters and chunks from the original VFX simulation, reusing the native geometry and per-fragment transforms and colors. Shapes and material are shared between wall impacts. **The option defaults to off in the game.** Its standard WebGPU material is an approximation of the original procedural material; local lights and soft depth are not yet ported, and visual parity is not established.

Run `node --test tests/webgpu-agriculture-vfx.test.js` with Node 20 to cover confirmed wall hits for brambles, adobe and stone, as well as expiry. `tools/experiments/audit_webgpu_agriculture_vfx.mjs` enables experimental fragments in the WebGPU OffscreenCanvas path with Playwright through `NODE_PATH`; one run drew six adobe-hit sprites and 13 rigid fragments without uncaptured GPU errors. `tools/experiments/audit_live_webgpu_first_wall_hit.mjs` starts the real Worker raid from a prepared state with an animal attacking an intact wall. A previous run before the rigid pass observed confirmed `StructureHit` and `AnimalLogicalHit` events and six WebGPU wall sprites. Before the publication backlog safeguard, the render Worker reported `Presentation publication capacity exceeded` with the rigid pass; the cause was not established. The unmodified raid in `tools/experiments/audit_live_webgpu_raid_wall.mjs` ended after crop attacks without a detected wall hit.

After the publication backlog safeguard, the prepared raid was repeated with the development-only `qa-webgpu-wall-fragments` flag. One headless run reported a confirmed wall hit with six sprites and 14 fragments and no Worker failure. At that observation, the presentation was at sequence 381 / simulation time 24.9997 s, while the main-side confirmed state was at sequence 472 / 26.1497 s: approximately 1.15 simulation seconds behind. During the entire headless session, including loading, the sampled frame intervals were p95 33.47 ms, p99 166.77 ms and maximum 10,033 ms. These figures are not a physical GPU benchmark, a controlled before/after comparison, or proof of what caused the lag. The option remains disabled by default pending broader validation.

On the Windows development machine with Vite at `http://127.0.0.1:5175`, the commands were:

```powershell
$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
.\.cache\tooling\node20.exe --test tests/webgpu-world-client.test.js tests/webgpu-agriculture-vfx.test.js
.\.cache\tooling\node20.exe tools/experiments/audit_live_webgpu_first_wall_hit.mjs
```

The combined unit test run passed 15/15. The prepared raid command enables the QA flag in its URL and reports the metrics above.
