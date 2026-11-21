# Experimental WebGPU center destruction

The presentation creates the native deterministic destruction template lazily on the first confirmed damage to a center. Each center has independent damage and impact parameters; repair restores the intact model. Texture hydration continues across both presentations. The native kernel supplies fragment anchors, hole data and ash footprint; simulation and collisions remain owned by Wild Engine.

`tests/webgpu-center-destruction.test.js`, `tools/experiments/audit_webgpu_center_destruction.mjs` and `tools/experiments/audit_webgpu_settlements.mjs` cover distinct instance state, damage, ruin and repair, including a real center in a WebGPU Worker. These are functional checks, not a performance or visual parity result. Interior faces, rotated normals, the original ash material, fire, smoke and other destruction effects still need migration. The path remains behind the experimental game gate.
