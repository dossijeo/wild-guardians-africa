# Canyon cover: secondary seed and low quality

Reproduce Vite5190: node tools/experiments/capture-canyon-cover-secondary-low-20261022.mjs. Seed913, baja,1280x720, corrected footprint QA module.0/48/96/48/0 X travel, day-cold/day-warm/night.15 real nonblank captures, no captured errors. All sampled vertices avoid water/blocker radii and anchors remain dry.293/285/284/285/293 instances; three return images RGB exact. Warm return resource counts79 geometries/55textures repeat. This is bounded lifecycle evidence, not a long-session leak proof.

Day/night origin images inspected: vegetation remains readable among existing rocks and shrubs. This seed's same coordinate is a natural bank rather than seed712's settlement; therefore these are robustness views, not a direct seed-to-seed art A/B. Other travel images captured but not individually artistically reviewed. Low quality works, but the inherited experimental module has no quality-specific density reduction yet.

Instrumented sampleChunk:102 invocations,mean0.626ms,p951.400ms,max8.100ms,total63.900ms distributed across loading and travel. Includes candidates, masks, occupancy and leaf-footprint checks, excludes rebuild/upload/render and asynchronous streaming. Not an ABAB overhead estimate; no GPU/FPS claim or attribution of the maximum without profiling. Raw per-call data retained in captures.json. The observational post-render footprint audit is outside this timer and is QA-only.

Original ground/engine/gameplay unchanged. Candidate still needs occupied-world event verification and an integrated quality policy before native adoption. Existing global recipe unchanged.
