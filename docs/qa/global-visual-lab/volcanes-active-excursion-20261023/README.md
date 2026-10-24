# Volcanes — active day/night excursion

Source cb9ce9a27, medium, seed 712, 1280x720, production instance culling and full distant layers. Run `node tools/experiments/capture-volcano-active-excursion-20261023.mjs`, then `python tools/experiments/audit-desert-active-excursion-20261023.py docs/qa/global-visual-lab/volcanes-active-excursion-20261023` (the audit is biome-independent despite its historical name).

Actual app simulation loop, no manual ticks. Forty wall seconds each day/night, 144 m outward/return X excursion plus 50.4 m Z; terrain-following camera height. Native manual camera mode prevents raid-camera diversion. Night continues the day world state. Wind/material clocks and streaming remain active.

Day: 1059 observed frames, 37.5154 simulation seconds, 39 distinct chunk sets, 327 frames with far preparation pending. Render origin changes (0,0) to (144,0). Resources range 164–336 geometries and 79–109 textures. Night: 991 frames, 56.1956 simulation seconds, 38 chunk sets, 306 pending frames, origin (144,0); 180–224 geometries and 80–100 textures. Workers change in both phases. No recorded JS/shader/GL errors or unexpected pauses; exact intended X/Z camera path checked for every recorded frame.

Videos are 39.890 s / 39.872 s, 1054 / 986 encoded frames. Recorder/checkpoint overhead is present: these are not gameplay FPS or GPU benchmarks. Resource ranges during streaming do not prove long-term leak freedom.

Reviewed nine-checkpoint day/night contact sheets and full-resolution day far-point capture. No obvious missing terrain in these sampled views; settlement returns with its material character. Not an exhaustive frame-by-frame proof. Lava in the far-point crater has very regular, large luminous cells against richly detailed rock; record as a candidate for close material review, not a confirmed streaming bug or permission to change authoritative terrain. Horizon is mostly outside this elevated route, so this does not prove skyline quality. Preserve current art pending a focused comparison.

Both WebMs and checkpoint PNGs are retained locally; committed contact sheets, telemetry, summary and representative PNGs make the sampled review inspectable. Main and simulation source unchanged. This step advances active streaming validation but does not close the six-biome goal.
