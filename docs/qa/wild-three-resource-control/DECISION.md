# Decision: retain official Three.js; reject prototype P1 for adoption

2026-10-24. Branch codex/wild-three-resource-control; base02cb81d0d.
This closes the adoption decision for P1, not every possible internal Three change.
No game dependency, main, PR159 or scheduler worktree was replaced.

## Controlled initial-loading comparison

Serial A/B/A/B, fresh Chrome, same populated frozen Manglares fixture, media720p,
shared-memory pthread generation, same global scheduler, Guardian tail enabled.
A uses isolated unmodified r180 source. B uses patched source plus selected
animal ImageBitmap region preparation. Excluding Three from Vite prebundling
removed the duplicate-module warning; earlier smoke is excluded from acceptance.
Intel UHD was identified by the same-machine runtime texture probe:
ANGLE Intel UHD Graphics0x00009A60 Direct3D11. No GPU-time query was used for this
loading comparison; presentation intervals and synchronous wall costs are distinct.

| Run | Ready | Presentation P50/P95/P99/max (ms) | Outcome |
|---|---:|---|---|
| A1 |39.383s|16.655 /66.355 /116.345 /532.255|Completed|
| B1 |Not ready at watchdog|Not comparable: incomplete load|Failed|
| A2 |42.622s|16.650 /66.435 /116.455 /498.910|Completed|
| B2 |Not ready at watchdog|Not comparable: incomplete load|Failed|

The watchdog makes18 readiness observations10seconds apart (roughly170seconds
plus setup); do not report an exact180second generation cost. Both B runs have
25 native chunks and empty generation queues. The delay is graphics preparation.
A scheduler coordination totals42.575/42.580ms across entire loading, not perframe.

B2 diagnoses the failure: allocation0.135ms, first64-row copy183.47ms, no texture
completed, one job pending151.93seconds. The estimator retains the outlier; the
scheduler's bounded debt/recovery rules cannot admit a183ms estimate. CPU95 at
failure is1.15ms and budget4.22ms. Thus this is admission starvation after a real
synchronous stall, not ongoing GPU saturation inferred from a long load.

The earlier excluded smoke completed9textures/297units with no fallback, but
ready80.49seconds and a115.68ms unit. It supports neither fluency nor throughput.
Small isolated calls did not predict loaded-game behavior. The exact driver
reason for the183ms call (upload/conversion/backlog) has not been isolated.

## What the small patch does establish

Three remains the sole texture owner. Three files,58added/39removed lines,
optional per-copy mipmap generation and mirrored unpack state. No external GPU
texture allocator, new scheduler or game-side private-record mutation.
56 runtime correctness trials: nine animal maps, four prepared sky/environment
maps and alpha adversary, full/regions/full/regions. All tested mip bytes match,
no GL error, texture-count delta returns to0. These readbacks do not establish
whole-game visual equivalence, driver memory consumption or lifecycle acceptance.
No image resizing/compression. No additional pixel array in the region path;
driver staging memory is unavailable and must not be claimed zero.

The source-material probe eliminates160/320 repeated state queries and reduces
mip generation33/65 to2. Its explicit one-RAF-per-row pacing is not a performance
benchmark. Actual prepared sky uploads were already submillisecond to~1ms;
forcing partial uploads there is unjustified. The historical uAtlas slow sampler
belongs to VFX, not NativeSky; that resource remains untested in this prototype.

## Why no shader fork or streaming rollout

The existing reports already trace the large ground first-use stall to a recipe
prepared too late; stock compileAsync plus correct recipe preparation addresses
that ordering. Existing reflection and retention experiments are documented in
README. Retention avoided destroys without improving full transitions. A new
public wrapper would improve encapsulation but has no demonstrated additional
performance benefit. No shader ownership/refcount fork is justified currently.

B fails the mandatory resource-readiness gate. Do not expand this implementation
into active streaming, quality recovery or context restoration. Those acceptance
tests were NOT completed, and no claim of universal lifecycle safety is made.
Similarly, no claim of GPU savings, memory savings, artistic equivalence across
six biomes, or elimination of game hitches is warranted.

## Recommendation and next hypothesis

Keep official r180 and existing recipe preparation. Do not ship P1 or treat it as
a completed optimization. Preserve the reproducible patch and negative results.
A future retry needs bounded admission/fallback for observed driver outliers and
per-call attribution in the loaded scene; simply more/fewer stripes is insufficient.
That is integration work, not evidence requiring a larger renderer rewrite.
Success-log/reflection anticipation and asset preparation remain more grounded
leads than extending the fork without a measured benefit.

Reproduction: README describes isolated dependencies/source hashes/Vite servers.
run-loading-abab.py --fixture ABSOLUTE_FIXTURE --prefix NEW_PREFIX recreates the
paired sequence without overwriting prior reports. loading-summary.json retains
failures explicitly. Stock mode rolls back the source patch; omit the region pilot
to restore the original loading path. Normal game configuration was never changed.
