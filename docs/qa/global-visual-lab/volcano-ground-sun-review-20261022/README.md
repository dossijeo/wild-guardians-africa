# Volcano ground direct-sun warmth trial

Run capture-volcano-ground-sun-review-20261022.mjs with Vite5190. Seed712/media/1280x720, three day/night cameras, native versus QA warm mapped-ground sun. Day sun changes from (3.65,3.30,2.78) to (4.30,3.05,1.95) only for Volcano biome. Night endpoint, ambient, albedo/normal maps, models, lava and simulation remain unchanged. No geometry/textures/passes added.

Twelve real frames, six exact camera/time/calls/triangles pairs; no captured errors. All three night RGB frames are pixel-exact. Day game-camera baseline/candidate individually inspected: sun-facing rock reads warmer brown, while cavities retain dark separation. Improvement is restrained; broad rock still lacks reference's pronounced warm ridges and local dry vegetation. This is not final mockup quality, nor proof that every shadow pixel is unchanged (direct-light visibility is continuous).

Retain QA candidate for comparison, not native adoption yet. Next compare concentrating warmth on illuminated relief instead of progressively tinting the whole directly lit ground. Preserve night and model appearance. No CPU/GPU benchmark in this visual probe; unchanged counters do not prove shader cost. Measure the preferred visual variant before integration.
