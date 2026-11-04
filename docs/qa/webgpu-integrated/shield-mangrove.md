# Confirmed WebGPU shield in mangrove

Run Vite on 127.0.0.1:5175, set PLAYWRIGHT_MODULE to the installed Playwright package, then run `node tools/experiments/audit_webgpu_confirmed_shield.mjs`. Set QA_SCREENSHOT to save a capture. The audit starts real simulation and rendering Workers, checks the WebGPU backend, requests castShield, pauses after the cast and waits for confirmed geometry and resident terrain.

On this machine the confirmed spell appeared with 5,568 geometry vertices and 17 sprites; the accompanying capture shows the shield in the real mangrove scene at night. This is a functional smoke test, not an original-renderer visual parity or performance comparison. Terrain and lighting remain provisional; the shield includes a TSL hexagonal pattern, but its visual parity is not yet established. Shadow appearance requires a separate A/B test.

## Experimental mangrove ground

With `qa-webgpu-mangrove-ground` the real presentation Worker uses the native mangrove moss atlas with a partial TSL port of ground lighting and shadows. `node tools/experiments/audit_webgpu_real_mangrove_ground.mjs` runs a confirmed shield and an actual mangrove raid; set `QA_SCREENSHOT` to capture it. `mangrove-real-ground.png` shows the night result. The render is visibly too dark and not an approved visual match: environmental reflections, seed offset, contact AO, wet soil and visual parity remain unresolved. The switch is opt-in and absent masks or failed asset loads retain the original provisional terrain.
