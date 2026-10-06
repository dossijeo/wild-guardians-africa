# Native-backed billboard allocation

The isolated native transition fixture opts into nativeModels:false. It uses actual native color LOD batches and no longer allocates the unused prototype 3D geometry clone, material clone, instanced mesh, per-instance matrix buffer or model-only attributes. Defaults preserve the standalone prototype with its own model.

Unit verification rejects any source geometry/material clone and confirms readiness/suppression attributes still update, update() uploads no model matrices, and borrowed source geometry/material/texture are not disposed when the layer relinquishes ownership.

Browser: daytime acacia, elevated atlas, distance 50, GPU prepared and ready=1. World pixels to the right of the diagnostic panel are exactly identical to docs/qa/far-prelit-elevation8/mixed.png. Zero selection scans and zero model matrix uploads, empty warning/error console, no WebGL errors. No measured FPS or RAM improvement claim; only the specific allocations and CPU work are eliminated. The real gameplay layer remains pending integration.
