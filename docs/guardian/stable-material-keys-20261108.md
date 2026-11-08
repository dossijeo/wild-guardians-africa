# Event-owned WebGPU material keys

## Scope and decision

The headed GTX 1660 trace identified repeated CPU discovery in Three r180's
`RenderObject.getMaterialCacheKey`: material/prototype enumeration and
`customProgramCacheKey -> getNodeChildren`. These are renderer-worker CPU
operations, not evidence of GPU execution time.

Three alternatives were considered:

1. Remove structural checks and key solely by material identity/version. Unsafe:
   sampler settings and several public fields affect Three's key without a
   `material.needsUpdate` assignment. Shared shadow overrides also change roots.
2. Replace all renderer keys with a frozen application shader-family catalog.
   This would need a larger migration of internal shadow, pass and geometry
   contracts. A shared material is not a guarantee of one pipeline.
3. Own the existing material-key contract, discover it once, and update an exact
   structural identity through change notifications. Implemented here; Three
   remains the reference for the actual material-key string.

## Implemented contract

`webgpu-stable-material-keys.js` owns keys for each graphics renderer. The real
world surface enables it by default. The existing version-checked postinstall
patch hooks both Three WebGPU bundles and the source `RenderObject` module.

- Adoption captures the public field recipe and direct graph/texture slots.
  Stable draws do not enumerate the material, prototypes or node graph.
- Assignments update a canonical structural identity. An interned binary tuple
  tree updates one field and its parents, rather than rereading every material
  property. Tuple identities are exact, not probabilistic hashes.
- Uniform values, color contents and texture pixel uploads retain the key.
  Root replacements, root versions, sampler settings and relevant material
  state changes update their corresponding identity fields.
- Shared shadow materials can return to a previously seen configuration without
  rediscovering the graph or rereading unrelated material fields. Subscription
  rebinding visits the recorded dependency slots, not the material graph.
- Each new configuration invokes Three's original key builder once. Up to 128
  variants are retained per material. Tuple interning is bounded at 8192 entries;
  reaching the bound retires variants and rebuilds from stored tokens, without
  inspecting material properties. Material/renderer disposal releases observers.
- Pipeline admission is the structural ownership boundary. It invalidates a
  material recipe before preparing a changed object or alternative material.
  Owners adding fields or changing nested topology in place must re-admit or
  explicitly call `renderer._wgMaterialKeys.invalidate(material)`.
- Custom cache-key functions, custom root key implementations, mutable node
  collections and unsupported descriptors keep Three's reference path. A
  replacement collection stays on that path until explicitly re-admitted.

Geometry layouts, skeletons, instancing, clipping, receive-shadow state and
dynamic scene/pass keys remain under Three's existing logic. This change does
not remove all renderer key work or migrate content/materials.

## Verification and rollback

112 targeted tests pass, including comparisons against the actual patched
Three `RenderObject`, switching shadow configurations, shared sampler changes,
root versions, parameter changes, collection fallback, disposal, pipeline
admission and the independent sky-admission path. A regression test verifies
that 100 switches between known shadow variants never reread an unrelated
material field. Additional regressions cover bounded tuple interning, sticky
fallback for unsupported root keys and null versus absent sampler fields.

`VITE_WEBGPU_AUDIT_MATERIAL_KEYS=true` compares every reused string against the
original builder and fails on a mismatch. Audit mode intentionally restores
the old discovery work and must not be used for performance measurements.
`VITE_WEBGPU_STABLE_MATERIAL_KEYS=false` restores Three's reference path.

Run tests with:

```powershell
.cache/tooling/node20.exe tools/patch-three-webgpu-pipeline.mjs
.cache/tooling/node20.exe --test tests/webgpu-stable-material-keys.test.js tests/webgpu-pipeline-admission.test.js tests/three-webgpu-shadow-compile.test.js tests/webgpu-material-graph-catalog.test.js
```

## Measurement protocol

Use the saved eight-animal raid with the normal Edge window, GTX 1660, and real
WebGPU device. The harness rejects software overrides; CDP identifies the GTX
1660 and the adapter creating Three's actual device reports NVIDIA/Turing with
`isFallbackAdapter:false`. No headless performance data is used.

Use the server flags from `headed-publication-transactions-20261108.md`, with
audit disabled. Harness flags: `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`,
`QA_WINDOW_MS=10000`, `QA_QUEUE_DIAGNOSTICS=1`, `QA_REQUIRE_GPU='GTX 1660'`.
Run A/B/B/A with a distinct `QA_OUT_FILE` each time;
`QA_STABLE_KEYS_BASELINE=1` disables only the key owner for A. Do not combine
this override with other world-surface source overrides. Resources are made
ready while simulation is paused, followed by the existing 10-second warm-up.
Keep code fixed throughout each comparison.

The wall duration of `render()` is not GPU time. Main-thread rAF intervals are
not the graphics worker's frame intervals. Sparse asynchronous simulation-lag
samples are not latency percentiles. These short runs are diagnostic and do
not establish broad gameplay performance or visual parity for all content.

An earlier run exposed an integration error in the sky-admission path. That
error was fixed and covered by a regression test; affected runs are excluded.
Intermediate measurements preceded the incremental tuple identity and are not
the final implementation's results.

## Results

[Recorded samples and summaries](stable-material-keys-20261108.json) include the
chronological A/B/B/A comparison of incremental identities. Two subsequent
conservative edge-case fixes keep unsupported roots on the reference path and
distinguish null/undefined sampler tokens. The final committed code passed a
new live reference-key audit: **79,391 hits, 527 builds, 111 fallbacks, 614
adoptions**, with no material-key mismatch. Audit costs are excluded below.

| Run | Render call mean / p95 / p99 ms | Timeline pump p95 ms | Worker draw interval p95 / p99 / max ms | Main rAF p95 ms | Final sampled lag s |
| --- | --- | ---: | --- | ---: | ---: |
| A1 reference | 43.20 / 53.63 / 64.73 | 50.25 | 148.71 / 197.65 / 392.66 | 33.375 | 5.95 |
| B1 incremental identity | 37.72 / 50.30 / 53.94 | 55.34 | 156.24 / 211.26 / 559.70 | 33.375 | 5.65 |
| B2 incremental identity | 38.24 / 47.86 / 55.20 | 56.66 | 151.29 / 229.00 / 318.14 | 33.390 | 5.90 |
| A2 reference | 47.95 / 61.47 / 74.09 | 55.13 | 234.81 / 294.97 / 396.01 | 33.370 | 5.25 |

For these summaries, worker samples are selected after the first inspection's
last recorded draw and through the final inspection. Intervals are differences
between consecutive selected draw timestamps. The raw selected samples and
main-rAF summaries, including maxima, are preserved in the JSON.

B1/B2 end with 96,037/97,388 hits and 567/575 full builds respectively. During
the measured interval alone B1 adds 41,501 hits and 105 builds; B2 adds 44,338
hits and 107 builds. Each adds one reference fallback. The counters measure
work eliminated, not just movement of work to another thread.

The render-call CPU/wall reduction is a **partial** improvement. Pump cost and
overall intervals do not show a uniform improvement, and the several-second
visual backlog is **not resolved**. In particular the 559.70 ms B1 maximum
must not be hidden by the lower mean render-call time. The next investigation
must address the remaining timeline/publication and draw costs; this change
does not establish their causes or justify increasing FPS claims.

Paused A1/B1 captures were inspected at the same simulation time (3430 s),
camera, 25 resident chunks and 12 visible grass chunks. Scene composition,
materials and silhouettes are preserved in this view. Presentation animation
phases differ, so these are not pixel-exact golden images. Captures remain in
`.cache/stable-keys-identity-a1.png` and `b1.png` (with the same filename prefix).
Existing darkness and noisy vegetation remain outside this task's scope;
these captures do not certify visual parity with the old WebGL renderer.

Implementation commit: `82a5d63fe`, on `codex/guardian-3d-animation`.
