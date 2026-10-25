# gran-rio: raised distant mountain candidate

Source6560f479d. Seed712, medium,1280x720, saved populated fixture, paused, daytime150/night350, three shallow-angle views. Baseline in ../gran-rio-horizon-review-20261023. Candidate changes only mountain arc baseY from-35 to-10 in a QA module route; same atlas,silhouettes,radius,height,parallax,depth test and shading. Other biomes/defaults are unchanged because no production source was edited.

Six matched comparisons: camera,target,clock,elapsed,workers,origin,draw calls,triangles and renderer resource counts all match; no GL/browser errors. [Day comparison](day-0-comparison.jpg), [night comparison](night-0-comparison.jpg); all three views have paired JPGs. Draw counts are not GPU timings: exposing more mountain pixels may change fill cost. No zero-cost claim.

Baseline mountains are largely occluded by terrain and trees in these poses. Sabana depth-test-off diagnostic confirms geometry/textures are present but incorrectly overlays the foreground, so that approach is rejected. The raised candidate exposes the crest while preserving ordinary foreground occlusion. Inspected Sabana day views0/1 and night0, Gran Rio day0 and night2; remaining views have paired outputs/structural checks but are not all claimed manually reviewed. No obvious floating lower edge in inspected frames. Left-side flat terrain gaps remain; not a complete horizon-art solution.

**Retain as an artistic candidate**, not a default or completed biome. Next verify moving/rebased camera and normal elevated game view for floating bases or excessive skyline height, then measure fill cost before native integration. No new mesh,draw pass,texture,simulation or navigation change. The diagnostic without depth must never be promoted.

Reproduce: set WG_FIXTURE_BIOME=gran-rio, WG_COVER_QUALITY=media and a fresh WG_REVIEW_OUT. Run tools/experiments/capture-populated-horizon-20261023.mjs for baseline, then tools/experiments/capture-horizon-raised-20261023.mjs for candidate, with Vite5190. Raw captures.json records exact poses and state.
