# WebGPU biome instance attributes: QA experiment

This reversible experiment is enabled only in a development build with
`qa-webgpu-biome-attributes` alongside `qa-webgpu-world`. The default retains
the existing native instance contract and material ownership. It shares only
materials with matching bindings and parameters, and stores transforms in
per-chunk instanced attributes. A lazily created CPU proxy preserves raycasts;
it is not submitted to the GPU. Terrain and gameplay authority are unchanged.

Three's current WebGPU render-object cache includes the native InstancedMesh
object identity. Sharing materials alone therefore did not reduce pipelines.
With 19 real biome slots, shadows enabled and a fixed camera, measured calls to
`createRenderPipeline` after the first and second chunks were 41/60 for native
and 7/7 for attributes, for both savanna and mangrove. Shader-module calls were
47/66 versus 11/11 in savanna and 48/67 versus 11/11 in mangrove. These are
API creation counts, not frame-time or GPU duration measurements. Pixel RGB
differences were at most one level in these fixed comparisons. They do not
establish complete visual parity or an independent proof of visible shadows.

Run the isolated browser comparisons with
`node tools/experiments/audit_webgpu_biome_material_sharing.mjs`; see its
environment options for biome and output. The captures and raw counters from
this run are in [savanna results](biome-instance-savanna-qa.json) and
[mangrove results](biome-instance-mangrove-qa.json).

The opt-in live audit was run with `QA_RAID=1`, `QA_ALL=1`, `QA_PROPS=1`,
`QA_BIOME_ATTRIBUTES=1`, `QA_WORKERS=1`, `QA_SETTLEMENTS=1`, `QA_CROPS=1`
and `QA_SKY=1` using `tools/experiments/audit_live_webgpu_world.mjs`. It
reported WebGPU, 28 resident chunks, 409 prop meshes, nine shared materials,
11 ready animals, 23 ready workers, one center, 90 walls and 143 crops with
no reported prop failure. This is an opt-in incomplete presentation, not
production integration or an FPS benchmark. The game retained its legacy
scene. The combined `webgpu-biome-props`, `webgpu-picker` and
`webgpu-world-client` Node tests passed 16/16, including raycast comparison
against native instances and explicit opt-in propagation.

The experiment has not established full-scene picking, every transform and
biome, independent shadow visibility, visual parity during play, or sustained
performance on multiple adapters. The lazy raycast proxy also consumes CPU
memory once used. Keep the production default until these limitations are
validated, and avoid interpreting fewer pipeline creations as measured FPS.
