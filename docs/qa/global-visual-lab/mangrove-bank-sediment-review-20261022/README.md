# Mangrove irregular shallow sediment trial

Reproduce `node tools/experiments/capture-mangrove-bank-sediment-review-20261022.mjs` with Vite on port 5190. Seed 712, media, 1280x720, three identical day/night cameras. Twelve real frames; six pairs camera/time/calls/triangles exact, no captured errors.

Reuses previous one-float shore-distance attribute. Two procedural world-space noise scales vary deposit coverage, width (.35-3.5 units) and green-brown color; screen derivatives attenuate fine variation at distance. No new geometry, draw calls, textures or passes. Still a shoreline-distance proxy, not actual optical depth.

Individual game-camera day/night review: the uninterrupted dark halo is reduced. Local sediment patches are visible at the lower-left bank, and night avoids the previous continuous heavy outline. But the broad green terrain still meets water with a hard clean edge. The overall improvement is modest and does not approach the reference's broken muddy/leafy shoreline by itself.

Decision: retain as an intermediate QA candidate, not native integration or final artistic success. Next pair with localized wet substrate on the land side using coherent shore coordinates, rather than repeatedly increasing water tint. Do not alter terrain silhouette or add plants merely to hide a shader boundary. No CPU/GPU benchmark yet; counters establish identical submissions only. Measure combined candidate if visually convincing before adoption. Other original biome improvements are preserved.
