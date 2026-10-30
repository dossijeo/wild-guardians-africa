# Recovery collider refit trial — not enabled in gameplay

Reusing support vertices selected in the standing pose can underfit a changed
recovery pose. On the recorded native rhino pose, a full refit gains up to
0.13623 m of directional support on RightUpLeg, 0.03822 m on LeftArm, and
0.03161 m on Spine. This is a controlled cache comparison, not a reconstruction
of the exact live colliders that produced the negative contact capture.

`audit-ragdoll-collider-cache.mjs` reproduces the comparison. The binding accepts
an explicit `colliders({refit:true})` diagnostic option, which scans all eligible
samples without overwriting the shared standing-pose cache. A real-model
regression proves equality with a fresh geometry refit and cache preservation.
The 20 selected ragdoll, replay and refit tests pass.

Temporarily enabling refit for attacks during recovery was tested in the native
WorldScene fixture. Both knockdowns finished, no browser errors occurred, and
the minimum sampled full-skin clearance was +0.007618 m. However the physics
step peaked at 167.405 ms, with startMs 165.575 ms. Node refit measurements were
134.8–194.1 ms over twelve calls. This is not acceptable for interactive combat.

The gameplay activation was removed after the experiment. Only the opt-in
diagnostic, comparison and regression remain. No ordinary hit now takes this
full-refit path. Receipts: `rhino-collider-cache.json` and
`rhino-refit-candidate.json` (the latter records the temporary candidate).

Next implementation work: reduce pose-dependent support selection cost before
enabling refit, retaining the fresh-refit output as the correctness oracle.
This one successful contact run neither proves a fix for the earlier entry
penetration nor establishes the full visual acceptance matrix.

## Exact quantile optimization

The fit now selects coordinate/radius order statistics with three-way partitioning
instead of sorting the entire arrays five times per collider. Numeric-sort oracle
tests cover equal, increasing, decreasing, discrete and continuous samples up to
12,000 entries and all used quantiles. The captured-pose refit regression still
matches an uncached fit and preserves the standing support cache.

The twelve local refit measurements in `rhino-refit-quickselect.json` range from
98.0 to 149.8 ms, compared with 134.8–194.1 ms in the previous receipt. These are
separate Node runs, not an interleaved browser performance comparison. The full
refit remains disabled in gameplay: this reduction is insufficient to justify
an input-time rebuild. No claim of browser frametime acceptance is made.

## Per-scan tail classification

A Node CPU profile of the full-refit audit identified repeated tail hierarchy
walks as a substantial cost (378 self samples plus 82 regex samples, alongside
397 garbage-collection and 375 hull-selection samples). Collider scans now
prepare tail ownership once per mesh, retaining identical weighted-majority
and authored-mask rules. The predicate is rebuilt each scan, avoiding stale
classification after hierarchy or mask edits.

Every vertex of all five installed beast models is compared with the original
classifier. Those tests and the refit/ragdoll tests pass (22 tests total).
The next local measurement is `rhino-refit-tail-scan.json`: 64.7–128.3 ms across
twelve full refits. These separate Node runs do not establish browser frametime
gains. Full-refit gameplay activation remains off. Allocation and hull-selection
costs remain the next targets; no contact acceptance claim is added.

## Rejected packed support search

An experiment packed each group's point coordinates into Float64Array before
scanning the same 96 directions, preserving strict comparison and original
vertex tie order. Randomized and tied-point oracle tests and the real rhino
refit comparison passed. It was then measured against the existing object scan
in one Node process: three warmup refits per implementation, twenty pairs,
alternating execution order, same captured rhino pose, full refit each time.

`rhino-support-interleaved.json` records all pairs. Median full-fit time was
93.9885 ms for the existing scan and 104.7623 ms for the packed candidate;
maxima were 202.7293 and 161.5377 ms respectively. The lower maximum does not
justify the worse median or establish reduced browser stutter. The candidate
and its helper were removed. No production code changes from this experiment
remain. The result points away from repacking each fit and toward reducing
per-fit allocation/skinning work. Full-refit activation remains pending.

## Prepare bone matrices once per collider scan

`poseSkinSampler` computes bone-world × inverse-bind matrices once per mesh
scan. Morph evaluation still uses Three's Mesh implementation, and bind,
weighted skin and world transforms retain their original operation order.
The sampler is local to a synchronous scan, so no pose cache can survive an
animation update. All vertices of five real beasts, with active morphs and a
translated/rotated/nonuniformly scaled parent, agree with Three within 1e-9 m.
The real-model collider-refit comparison and articulated physics tests pass
alongside these comparisons (22 tests).

`rhino-skin-sampler.json` records twelve local full refits: 56.5–97.6 ms. These
are not an interleaved browser benchmark and do not prove a gameplay frametime
improvement. The full-refit recovery-hit activation remains disabled. This
reduces redundant matrix work without accepting the remaining input-time cost.

## Compact point records

The fit now reuses one temporary Vector3 for local-frame transformation, storing
plain coordinate/vertex records rather than allocating a Vector3 and adding
metadata to it for every skin point. This preserves arithmetic and vertex order.
An interleaved twenty-pair comparison against c010b3767 asserts deep equality of
all collider fields before timing. After three warmups per implementation,
execution order alternates on the same captured rhino pose.

Receipt `collider-allocation-pairs.json`: original median 61.0321 ms, candidate
49.0328 ms; maxima 112.2055 and 77.3335 ms. Reproduce with
`node tools/guardian/benchmark-collider-allocation.mjs` from the repository root.
This is a local Node measurement, not browser frametime acceptance. The 22
skinning, refit and articulated-physics tests pass. Full refit at recovery-hit
time remains disabled; its remaining cost still needs a bounded solution.
