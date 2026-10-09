# Unrepaired environment culling ceiling

Requested 9 October 2026. Frozen harness/runtime source: `5be52f4485fdf154ece661f48c74032365d24763`.

Compare native biome props (trees, shrubs, grass, rocks and environmental debris)
with their original DoubleSide material against the same geometries forced to
FrontSide. Terrain, sky, distant impostors, buildings, crops and actors are not
changed. No geometry repairs, production configuration changes or visual
acceptance are part of this experiment.

Two predetermined cases: Sabana and Mangroves, seed 712, Mapungubwe configuration,
time 120, fixed target X/Z 96/96, medium quality, 1280 × 720 render buffer.
The environment fixture contains no crops or workers and never advances the
simulation. Native prop LOD, grouping, vegetation and terrain remain enabled.
The native shadow cache is disabled in both arms to expose shadow-generation
cost; normal static cached gameplay may save much less from this component.

The QA hook changes the borrowed private solid prop-shadow material as well as
the visible prop materials. It restores every borrowed value after the shadow
traversal. A separate untimed draw witness verifies actual GL culling state for
both color and shadow, before timing starts. This includes shader variants
selected by material side; it is not an isolated driver-culling-only measurement.

After warming both variants, run `AB BA BA AB`, with 45 warm-up frames per arm.
Each arm has 60 whole-render GPU queries and 60 distinct frames with successive,
nonoverlapping shadow/main-color queries. A further 30 queries measure the native
depth capture in isolation, representing synthetic VFX demand. That capture is
not present in ordinary total frames. Main color excludes the sky and shadow
generation. Do not sum these different-frame measurements into a total.

Use asynchronous `EXT_disjoint_timer_query_webgl2`, preserving every sample.
Reject missing queries, disjoint events, overflows, foreign queries, allocation
failures, pending queries or logical/camera/chunk/instance changes. No resource
readbacks or GL-state probes during timed frames. Other local GPU or heavy CPU
work must remain paused. Report mean, median, p95 and four paired differences;
keep CPU submission timings distinct from GPU duration and frame intervals.

A practical positive signal is a total-GPU mean saving over 10% and over 1 ms,
with all four pair differences in the same direction. This is a decision aid on
the observed hardware, not a statistical significance test or an assertion that
all biomes, views, foliage or devices can safely use FrontSide. Smaller consistent
gains may justify selective work if its asset cost is low. Visual correctness
must be considered independently before any production activation.

Restore original materials, release the context, retain original JSON and
console observations, and reset the temporary browser viewport after testing.
