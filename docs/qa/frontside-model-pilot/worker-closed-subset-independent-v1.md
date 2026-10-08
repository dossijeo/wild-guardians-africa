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

Source-only native HEAD950fca1a confirms the variation in30draws: repeats alternate
between0 and21changed bytes/max59, alpha unchanged. Suite46954 had already
finished3139/3139PASS; CPU43808/49032 remained alive. The nominal RGB ID draw
identifies6pixels on front-facing Mesh0face9365. This is later ID attribution,
not proof of cause or permission to adapt this held-out face. No candidate drawn.
Original/repeat/difference remains visible as a static image after WebGL disposal.
Archive: worker-closed-subset-source-only-v1-{diagnostic.json,diagnostic.png,
browser.png,console.json}. The source problem is not blamed solely on a suite or
first draw because it persists without the suite and across later repeats.

## Next isolated source program/state audit

Append sourceStateAudit to the source-only URL. This opt-in instrumentation is
rejected for any candidate acceptance run. Each original color draw records
actual linked program shader-source strings, active uniform values, matrixWorld/
modelView/normal matrices, texture object identities and sampler units, VAO and
active attribute/buffer layout, element buffer, drawRange, depth/cull/blend/dither/
polygon offset/framebuffer state and bone texture data fingerprint. Original
attribute/index buffer fingerprints are sampled at start/end. All original mesh
hooks are composed/restored before the later ID draw; activeTexture is restored
after inspection. No product shader/material/render setting is changed.

GL queries can alter CPU/GPU timing and possibly observed variability. This is
an instrumented source diagnostic, never a benchmark or V1 acceptance retry.
Identities are local to this capture; FNV32 data fingerprints are diagnostic,
not cryptographic equality proofs. Shader sources are retained verbatim, but are
not the compiled driver machine program. Equal captured fields cannot exclude
unobserved state or establish a cause. Analyze with
node tools/frontside_source_draw_compare.mjs PATH_TO_REPORT; draw records are
compared by ordinal against the reference and all differing fields reported.
The quality/control gates remain unchanged and V1 remains invalid regardless
of this diagnostic result.

Native c340c8cf audit is now archived as worker-source-state-audit-v1.json/PNG,
analysis/browser/console. One Mesh0 draw/program per frame; all30repeat snapshots
match captured GL program/uniforms/attributes/render state/matrices/texture
identities and bone/attribute fingerprints. Yet source RGB still alternates0/21
changed bytes/max59, alpha unchanged. This does not inspect actual GPU texture
texels, depth texture contents or compiled driver arithmetic; no causal exclusion
beyond the captured fields is claimed. V1 remains invalid with zero compared
samples. Root preserved an independent compressed copy/verifier in main4e1ac82d.
