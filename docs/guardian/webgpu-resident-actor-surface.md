# Resident ground samples for WebGPU actors

The WebGPU animal and worker presentation already owns the Wild Engine
chunk payloads. `WebGpuTerrainResidency` exposes their `SpatialSurfaceView`,
which evaluates the same two ground triangles as the mesh. Actor placement
now uses that resident view instead of raycasting the same ground mesh. The
existing raycast remains the fallback if the view has no finite sample and at
cell edges, diagonals and chunk seams. The cache still follows mesh identity,
so replacement invalidates the prior result.

The edge fallback preserves a real behavior of the previous raycaster: at an
exact mangrove chunk corner the ray can miss and return zero even though the
resident surface is about 3.32 m. This change deliberately retains that
behavior instead of silently changing placement. It samples the same **ground**
as the old WebGPU path. It does not implement `nav.actorSurface` water support:
the authority may raise actors above water in mangroves and canyons.

`tests/webgpu-actor-terrain.test.js` compares the view against the actual
rendered Wild Engine geometry in six biomes, across two resident chunks and
five seam points per biome; the tolerance is 0.00005 m. It also checks fallback
and caching. The existing animal, worker and terrain residency tests pass.
This is geometric CPU validation, not a visual comparison of a running game.

Two alternating-order Node CPU runs on a real seed-712 mangrove chunk sampled
256 varied non-edge coordinates per batch, with four warm-up batches and 16
measured batches. Raycast mean/p95/p99 were 144.16/253.02/253.02 ms and
131.56/188.07/188.07 ms per batch; the resident view was
0.101/0.156/0.156 ms and 0.099/0.163/0.163 ms. All 256 values matched in those
runs. These are repeated CPU samples, not a frame, a GPU measurement or a
gameplay FPS claim. With 16 batches, p95 and p99 are the maximum and do not
characterize a reliable tail. Results are retained in
`gpu-animation/actor-surface-sampling-ab-20261105.json`; reproduce with
`node tools/experiments/audit_actor_surface_sampling.mjs` from the repository.

For eventual GPU trajectory support, a packed R32F grid needs 9,604 bytes per
49×49 chunk. The existing Three.js position buffer is created for vertex use;
sharing it directly as storage is not established, and Three's storage path
pads vec3 attributes to vec4 and changes their layout. A separate packed
buffer costs a copy and upload on chunk changes but avoids per-segment WASM
queries. Neither that GPU grid nor its per-revision lifetime has been
implemented. The terrain channel can arrive independently of state; old
residency versions are currently discarded. A causal chunk-revision manifest,
retention until a window finishes, water coverage and edge validation remain
necessary before this data can support an autonomous global timeline.
