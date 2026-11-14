# Confirmed WebGPU shield in mangrove

Run Vite on 127.0.0.1:5175, set PLAYWRIGHT_MODULE to the installed Playwright package, then run `node tools/experiments/audit_webgpu_confirmed_shield.mjs`. Set QA_SCREENSHOT to save a capture. The audit starts real simulation and rendering Workers, checks the WebGPU backend, requests castShield, pauses after the cast and waits for confirmed geometry and resident terrain.

On this machine the confirmed spell appeared with 5,568 geometry vertices and 17 sprites; the accompanying capture shows the shield in the real mangrove scene at night. This is a functional smoke test, not an original-renderer visual parity or performance comparison. Terrain and lighting remain provisional; the shield includes a TSL hexagonal pattern, but its visual parity is not yet established. Shadow appearance requires a separate A/B test.

## Experimental mangrove ground

With `qa-webgpu-mangrove-ground` the real presentation Worker uses the native mangrove moss atlas with a partial TSL port of ground lighting and shadows. `node tools/experiments/audit_webgpu_real_mangrove_ground.mjs` runs a confirmed shield and an actual mangrove raid; set `QA_SCREENSHOT` to capture it. `mangrove-real-ground.png` shows the night result. The render is visibly too dark and not an approved visual match: environmental reflections, seed offset, contact AO, wet soil and visual parity remain unresolved. The switch is opt-in and absent masks or failed asset loads retain the original provisional terrain.

## Ground A/B in the real WebGPU scene

`node tools/experiments/compare_webgpu_mangrove_ground.mjs` captures the same top-down mangrove scenario with provisional vertex-colour ground and the experimental moss ground at simulation times 100 (day) and 400 (night); `QA_OUTPUT_DIR` changes the capture directory. A confirmed shield is cast and the simulation is paused, but each run pauses at a slightly different elapsed time and actors/foliage can vary. This is a comparison of the two **WebGPU** materials, not an A/B against the original WebGL ground, and does not establish visual parity. The day captures show that the moss material adds strong green texture instead of a flat provisional surface; at night the moss ground is almost black, so its illumination remains unacceptable pending comparison with the original and further correction. Four screenshots named `ground-top-{day,night}-{baseline,moss}.png` document the result. The experimental flag remains off by default.

## Ground output encoding correction

The experimental ground previously wrote `pow(filmic,2.2)` into the WebGPU world's `LinearSRGBColorSpace` output. The original WebGL world uses `SRGBColorSpace`, so the equivalent presentation needs the sRGB output transfer. The TSL material now applies `sRGBTransferOETF` locally; the renderer and other materials remain untouched. The real-scene top-down before/after screenshots are `ground-top-night-moss.png` and `ground-top-night-moss-corrected.png`; the latter shows the green ground at night rather than a near-black surface. `ground-top-day-moss-corrected.png` records the day result. These are WebGPU before/after captures, not same-camera comparison with original WebGL. Reflection, contact AO and authored seed are still missing; the option remains disabled by default.
