# Five rigid accessories: independent screen V1 (not approved)

The two native training reports at source HEAD998d8e34 are archived as
worker-closed-subset-source-repack-guided-screen.json and
worker-closed-subset-front-guided-screen.json. Both retain original body FrontSide,
three repeated original color controls are exact, color IoU1/MAE0/tile0 and packed
shadow bytes exact. Each arm submits20draw calls/65662triangles including shadows.
The chosen crate/hoe meshes still use shadowDouble in this color-isolation test.
This one Carry_Crate pose does not approve the other clips or shadows.

The Front comparison PNG is retained in worker-closed-subset-front-guided-screen.png.
The source-repack control comparison PNG was overwritten by the next POST before
archiving: only its report and disposed-canvas browser screenshot exist. Do not
describe that screenshot as an independent comparison image. Both disposed-canvas
screenshots are retained for provenance. The fixture now replaces #view with the
actual three-panel comparison PNG before disposing WebGL, so subsequent browser
screenshots can show the comparison without an active GPU context.

Native Front console had a warning about potentially uninitialized f_environment4;
source-repack control console was empty. Cause and significance remain unresolved.
No shader fix or acceptance is inferred from exact pixels in this training pose.

## Prospective next selection

Generate worker-closed-subset-independent-v1-views.json with
python tools/frontside_worker_closed_views.py. The fixed seed is
998d8e34:worker-closed-subset-independent-v1. SHA256 controls azimuth jitter only;
no raster output, face masks or rejected view selection enters generation.
The120cases include12authored clips, five exact fractions0/.25/.5/.75/1 and two
directions each. They are stratified through16azimuth sectors, elevations
-15/5/25/55/85, all six actual biome identifiers and night values0/.5/1.
This is an independent rejection screen, not the complete all-angle category gate.
Use limit=60 then caseOffset=60&limit=60 to bound browser sessions; archive every
POST/PNG before the next run. Preserve failures and stop; do not reroll controls.

First color path:
http://localhost:5284/tests/browser/frontside-worker-visual.html?closedSubset&closedSubsetV1&limit=60&cpuCampaigns=43808%2F49032-active-suite46954

Source repack control uses sourceRepackControl instead of closedSubset; selected
Double control uses closedSubset&doubleControl. ShadowFront must be a separate
closedSubset&closedSubsetV1&frontShadow run after the color screen. Nonselected
accessories stay original DoubleSide and body keeps its actual default shadowSide.
All actual depth draw sides are recorded via onBeforeShadow. Packed shadow source
readbacks must be byte-exact across all three original repeats in shadowFront mode,
otherwise the sample is invalid and stopped. Candidate shadow coverage IoU≥.999,
coverage XOR≤.001 and world depth delta≤max(.0001,height*.0001) are evaluated with
the already documented packed-depth helper. No tolerance is increased or noise
subtracted. Color/alpha/local-region gates and control uncertainty policy remain
unchanged; shadowFront must pass both color and shadow gates.

Every selected-subset sample now also records a later source/candidate triangle-ID
coverage draw, summarized by mesh as maximum visible pixel/face counts and number
of visible samples. It preserves original geometry, skin, clip and tool visibility.
It is coverage evidence only, not a shader-map pass. Verify all five parts are
actually visible with useful area across action poses; zero-area parts require
additional prospectively chosen views, never acceptance from empty draws.

No benchmark while the main full suite is active. Neither this screen nor source
packing savings count as GPU benefit. Net AB/BA GPU, all relevant maps/materials,
full clip/angle/shadow coverage and resources remain required before extension.

## Native result: invalid original control before candidate

HEAD9dafb8a0 first V1 case (Idle0, Sabana/day, az8.23131151293202,
elevation-15) stopped before any compared sample: samples=[]; not60cases.
Repeated original draws differ21bytes, max59, alpha unchanged. The source
envelope maxTileMae=.0107574372863 and maxError=.205660589 exceed the prospective
control budget; a connected7pixel region has diameter3.60555. Candidate quality
cannot be interpreted. Native report/browser/console are archived under
worker-closed-subset-independent-v1-invalid-*. CPU suite46954 and campaigns
43808/49032 were alive; the short Blender18024 offline job also overlapped.
No second block, shadowFront or GPU benchmark is eligible from this result.

Next source-only diagnostic uses the exact frozen first case, without a candidate:
http://localhost:5284/tests/browser/frontside-worker-visual.html?sourceTwin&controlDiagnosis&closedSubsetV1&limit=1&cpuCampaigns=43808%2F49032-active-suite46954

It performs30original draws, reports their unchanged control metrics and later
ID provenance for the worst source difference. A retained PNG shows original,
worst original repeat and amplified difference; it is explicitly source-only.
This does not retry acceptance, change gates, infer the noise cause or select
candidate geometry from a held-out view. V1 remains invalid.
