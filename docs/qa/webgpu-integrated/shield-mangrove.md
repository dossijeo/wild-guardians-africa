# Confirmed WebGPU shield in mangrove

Run Vite on 127.0.0.1:5175, set PLAYWRIGHT_MODULE to the installed Playwright package, then run `node tools/experiments/audit_webgpu_confirmed_shield.mjs`. Set QA_SCREENSHOT to save a capture. The audit starts real simulation and rendering Workers, checks the WebGPU backend, requests castShield, pauses after the cast and waits for confirmed geometry and resident terrain.

On this machine the confirmed spell appeared with 5,568 geometry vertices and 17 sprites; the accompanying capture shows the shield in the real mangrove scene at night. This is a functional smoke test, not an original-renderer visual parity or performance comparison. Terrain and lighting remain provisional; the shield's original hexagonal detail is not yet ported. Shadow appearance requires a separate A/B test.
