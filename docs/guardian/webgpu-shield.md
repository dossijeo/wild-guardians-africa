# WebGPU shield presentation

The WebGPU world subscribes to the existing `shieldVfxPlans` derived from confirmed spells and `AnimalLogicalHit` events. The existing native VFX composer generates the shield dome, rings and contact sprites; the WebGPU VFX controller shares its atlas with agriculture, combat and guardian aura. A terrain residency miss hides an effect until the terrain is available. Removing or expiring a confirmed spell or contact removes its presentation. The existing WebGL shield remains the fallback and the simulation remains authoritative.

The geometry adapter draws the native vertices in WebGPU with a TSL Fresnel edge, hexagonal pattern and scan. Soft depth and local lights are not yet ported, so this is not established visual parity. Geometry is currently regenerated and uploaded during presentation preparation, with no performance claim. A live game shield cast and matched visual comparison still need verification.

Run `node --test tests/webgpu-agriculture-vfx.test.js` on Node 20 for lifecycle, terrain and confirmed impact coverage. Run `tools/experiments/audit_webgpu_agriculture_vfx.mjs` against the Vite server with Playwright available through `NODE_PATH` for the OffscreenCanvas WebGPU draw. One run observed 5,568 shield vertices, 27,488 non-background pixels, no uncaptured GPU errors, and removal after the spell disappeared.
