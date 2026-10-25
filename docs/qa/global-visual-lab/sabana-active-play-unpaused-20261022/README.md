# Sabana: real active-play probe

Source 2043ace38, seed712, medium, full distant impostors and mountains. Loaded paid 12-crop/two-worker fixture, with tutorial.basicSkipped=true in QA save only. Ordinary app Game.advanceReal loop; no direct QA ticks, live material/wind clocks and streaming. Eight-metre lateral camera sweep over20wall seconds per phase. Night continues the changed daytime state; it is not an A/B comparison.

Day:380observed frames,17.512simulation seconds advanced. Night:328frames,35.794simulation seconds advanced (ordinary night speed differs). Workers change in both. No paused frames, page/GL errors or grass overflow. Resources vary with movement:day342–370geometries/109–110textures;night304–396/94–110. These ranges do not establish a leak or its absence.

Real WebM videos:day375decoded frames/19.793seconds;night323/19.845seconds,1280x720. Recorder drops some requested frames. Recording and screenshot checkpoint overhead means these are NOT FPS measurements. Midday checkpoint and five nighttime checkpoints visually inspected; not a claim of exhaustive frame-by-frame artifact review. Detailed wind/transition review and longer streaming remain open.

Rejected predecessor sabana-active-play-20261022 was paused by tutorial-action. Strengthened runner now records pauses each frame and requires at least ten simulation seconds of progress plus no paused frames. Only the follow-up satisfies this check. No production simulation changes.

Reproduce with WG_FIXTURE_BIOME=sabana, WG_COVER_QUALITY=media, WG_REVIEW_OUT set to a fresh directory, then node tools/experiments/capture-populated-active-play-20261022.mjs. This is a short functional probe, not six-biome/campaign closure.
