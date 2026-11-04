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

Follow-up: the native/attribute raycast unit comparison also passes with a
rotated, non-uniformly scaled instance. A live savanna screenshot attempted
while starting a new game captured the camera transition, so it is not valid
evidence of vegetation or shadow parity. An older savanna raid fixture was
rejected as incompatible with the current world generator; changing the
version marker would not validate its terrain. Live visual and picking
comparisons for both biomes remain open. The live audit accepts optional
`QA_PICK`, `QA_SCENE_CAPTURE`, `QA_FIXTURE`, and `QA_ACTOR` parameters to
support those comparisons; a ground-only grid of pick results is not evidence
that vegetation occlusion works.

An additional bounded mangrove run with `QA_RAID=1`, `QA_REQUIRE_ACTOR=0`,
`QA_PROPS=1`, `QA_PICK=1`, `QA_BIOME_ATTRIBUTES=1` and
`QA_TIMEOUT_MS=45000` timed out during boot while waiting for the simulation
to report a running game. It did not reach inspection, picking or capture.
The local log is [stage log](biome-live-mangrove-timeout.txt). This is not evidence
of an instancing, selection or shadow defect, and does not close the above
validation gaps. The audit now bounds individual inspection and pick waits.

A subsequent single controlled run used the same options with a 150-second
boot budget, allowing for previously observed startup durations. It reached
the running game and reported the WebGPU world and props ready, then the
picking phase rejected a request as `Stale WebGPU pick` while the camera
version changed. It did not reach the screenshot. This is evidence of stale
request rejection, not evidence that vegetation selection is incorrect or
that visual and shadow parity holds. The local stage and error log is
[stage log](biome-live-mangrove-stale.txt); the contract remains QA-only.

A single follow-up paused the game and waited five seconds before picking.
It completed with WebGPU, 28 chunks and 409 prop meshes; all 15 picks
returned without a stale-camera rejection, with confirmed sequence numbers
278–309. All returned terrain and no entity, so they do not demonstrate
vegetation occlusion. The capture is obscured by the pause menu and cannot
validate shadows or visual parity. Local evidence is
[stage log](biome-live-mangrove-stable.txt) and
the local capture `.cache/biome-live-mangrove-stable.png`. No production default was changed.
