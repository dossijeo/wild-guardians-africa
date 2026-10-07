# Weighted skin-envelope groups — opt-in refinement

Ordinary gameplay remains on the original Three.js vertex bounds. This refines
the `skin-envelope=1` animal-preload QA pilot; it does not activate it globally.
The installation update keeps its existing timing, without per-frame updates.

Vertices are grouped by influencing bone indices and eight weight bins per unit
weight. Each term encloses `(weight * bindPosition, weight)`. At installation,
affine interval transforms conservatively sum those contributions in mesh-local
space. A translation correction preserves Three.js semantics for nonunit weight
sums. Preparation is cached by geometry/attribute versions and bind matrix;
cloned skeletons share preparation but retain private pose bounds. Unsupported
morphs, invalid data or nonfinite output fall back to the original vertex route.

`runtime-poses.json` records the exact helper/tool hashes and five deployed
Meshopt GLB hashes. All 31 original clips, 279 sampled poses and 7,050,222 vertex
containment checks pass under translated, rotated, nonuniformly scaled roots.
Maximum candidate/native sphere radius ratios range from 1.44 to 1.64, compared
with 2.01–2.31 for the first broad per-bone candidate. These are sampled maxima,
not a guarantee of tight bounds for arbitrary future assets or animations.

The analytic camera sweeps retain fewer extra candidate-visible spheres than
the broad candidate for every species. These counts are **not rendered draw
calls, GPU timings or evidence of pixel-identical culling**. Node alternating
timings and all samples are recorded; they cannot establish browser or phone
frametimes. Actual camera travel, frustum-edge behavior and shadow cost remain
required before gameplay activation.

Rejected exploration: summing independent weight intervals in world space made
far-root bounds enormous; moving to local space without weight bins still gave
radius ratios around 3.7–4.3. Neither was retained. Weight bins improved bounds.
`unoptimized-binned-poses.json` preserves the intermediate binned geometry check
before scratch transforms were reused; use its own source hashes, not the final
helper, when interpreting its timings. The first pilot's native screenshot and
arrival probe remain historical evidence, not browser acceptance of this code.

Validation: 17 skin-envelope/preload tests pass, including correlated positions,
tiny weights, duplicate bone indices, bin boundaries and 24 moving poses.
Production build passes with the existing bundle-size warning. Reproduce with
`node tools/check_skin_envelopes.mjs OUTPUT.json` and
`node --test tests/skin-envelope.test.js tests/animal-preload.test.js`.
