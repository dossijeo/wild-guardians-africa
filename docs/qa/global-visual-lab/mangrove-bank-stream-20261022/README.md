# Mangrove candidate live settled streaming

Run `node tools/experiments/capture-mangrove-bank-stream-20261022.mjs`, Vite port5190. Corrected-owner + gated sediment QA candidate; seed712/media/1280x720, day/night, camera and target move 0/48/96/48/0 units, waiting for chunks/horizon then 12 settling renders. Ten actual frames. Instrumentation counts creation and disposal events of shore textures, not estimated GPU memory.

Every stop has 25 live shore textures (created minus released), alongside 25 ground masks: BiomeGround.masks remains50. Each 48-unit step allocates5 and releases5 shore textures. Counts progress from34created/9released to74created/49released over both loops. Far-stop resident key symmetric difference is20 (10 replaced). This demonstrates no accumulating shore textures in this tested path; raw shore texels are30625 bytes plus driver overhead. It is not proof of all resource types being leak-free.

Return calls/triangles exact both phases; no captured errors. Night return RGB pixel exact. Day return pixels differ, cause not isolated; do not claim complete streaming parity or infer the same root cause as the earlier River cold drift. Controlled scene-first/material-first disposal exercise also passes. This is settled streaming, not rapid movement, latency or frame-time measurement.

Recommendation: retain candidate; mask lifecycle gate passes this path. Next isolate daytime drift with native control/warm repeat and inspect boundary continuity before native adoption. Prior ABAB performance stays separate. No changes to main or global-quality completion claim.
