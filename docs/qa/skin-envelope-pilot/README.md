# Bone-envelope animal arrival pilot — opt-in only

Ordinary gameplay retains the original vertex-based sphere computation. Enable
the experimental path only in `tests/browser/animal-preload.html` with
`skin-envelope=1`. The AnimalPreload option defaults to false; WorldScene only
passes it when `animalSkinEnvelope === true` before loading.

During preload, each influenced bone receives a bind-space box containing all
vertices with nonzero influence. Shared geometry/bind data reuses that immutable
preparation across private cloned skeletons. At installation, transform these
boxes by the current bone matrices, combine them, apply the mesh bind inverse
and derive a conservative sphere. No vertex traversal is needed at arrival.
Nonnegative weights use a convex-hull bound with their actual minimum/maximum
weight sums, including nonunit or zero sums. Morph targets, negative/invalid
weights, changed geometry and unsupported or overflowing transforms fall back
to the original calculation. Private output spheres do not mutate the cache.

`runtime-poses.json` verifies the five exact deployed Meshopt GLBs (hashes
checked against the manifest), with textures omitted in Node. Nine poses for
each of 31 original animation clips produce 279 sampled poses and **7,050,222
individual vertex containment checks**. Roots are translated to `(4800,5,-7200)`,
rotated on three axes and nonuniformly scaled. No checked vertex is excluded.
This sampling complements the analytic envelope; it is not a rendered
all-animation acceptance test. Node alternating timings show roughly 0.1 ms
for the envelope versus 11–14 ms for the full vertex calculation, with two long
CPU campaigns in the background. They do not establish GPU or phone frametimes.

There is a tradeoff: maximum radius ratios against the original pose sphere
range from 2.01 to 2.31. The broader sphere can retain additional offscreen
draws. Camera travel, frustum-edge and shadow cost must be checked before
enabling ordinary gameplay; no blanket performance or invisibility fix is
claimed yet. The installation update has the same pose timing as the previous
implementation; this pilot does not add per-frame sphere updates.

Native tab 657 ran Gran Cañón/Mapungubwe, medium quality, seed 712, paid center
and controlled five-species spawn:

`http://127.0.0.1:5191/tests/browser/animal-preload.html?biome=gran-canon&timing=1&prepare=1&plan-reserves=1&actor-profile=1&skin-envelope=1`

`native-report.json` passes readiness and ownership checks: all five warmed
spares used, five prepared meshes, downloads 7 before/after, no new animal
shader programs or rigs. The arrival probe records **zero native
computeBoundingSphere calls** during installation. Native console is empty.
Actor installation elapsed intervals are about 18 ms each but overlap, so they
cannot be summed as exclusive CPU time. The screenshot shows some animals
overlapping/offscreen; readiness is not proof that five distinct animals are
simultaneously visible. The tab was closed after capture. This sample precedes
the final overflow-only safeguard, whose final code is covered by the Node
pose and unit checks; no final-code browser acceptance is asserted.

Final checks: 16 skin-envelope/preload tests pass; production build passes
(existing bundle-size warning); browser syntax audit passes 137 files/136
scripts. `tools/check_skin_envelopes.mjs OUTPUT.json` reproduces the runtime
geometry check. Gameplay activation and camera/culling checks remain pending.
