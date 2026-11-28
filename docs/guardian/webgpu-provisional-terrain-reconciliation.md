# Provisional construction and terrain revisions

While a center or wall waits for its confirmed replacement, a terrain chunk can
be replaced. Previously the provisional mesh kept its old height even after the
visible terrain changed; the eventual confirmed model could then appear at a
different elevation. Active WebGPU previews now resample the visible terrain on
the existing terrain-change signal. Centers update their transform, and walls
update their instance matrices without replacing geometry or materials.

Wall strokes update atomically: if any sampled piece lacks visible terrain, the
whole preview retains its last known transforms until all samples are available.
The shared waiting indicator also updates the existing slot while assets or
pipeline admission are pending. It looks up the active command ID; terrain
updates cannot recreate a removed indicator.
The update is presentation-only and does not create colliders, alter authority,
or change command confirmation and rejection. The same wall helper remains
usable by the legacy renderer; its new method is invoked only on request.

`tests/webgpu-settlement-admission.test.js` checks the actual center preview,
terrain replacement, mesh identity, missing terrain and rejection.
`tests/provisional-walls.test.js` checks atomic stroke updates and resource
identity. These tests use Three.js objects and synthetic terrain, not a real
WebGPU device or an in-game visual comparison. Indicator updates and
cancellation are covered in `tests/webgpu-structure-wait-indicator.test.js`.
