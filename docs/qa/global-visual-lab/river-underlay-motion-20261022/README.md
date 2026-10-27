# River underlay camera/wind sequence

Two four-second comparison videos, day and night, 48 frames per arm at12fps. Left: approved coverage with original ground color sampling. Right: same coverage with gated filtered underlay. The inherited left-hand identifier `baseline-off` means **filter off**, not grass off; both arms retain geometry. Frame counters prove this.

Seed712, media1280x720 per panel. Camera follows a10-unit-radius loop around its starting pose, up to20 units displaced in Z, aiming at the same target. Coverage wind time advances at1/12 second per captured frame. Resident chunks are held fixed identically after settling; this is not streaming latency or a performance video. The frame sampling rate is not measured FPS.

96 paired frames have identical camera/target/time/draws/triangles, no GL/console errors, no instance overflow; candidate uniform [1,48]. `audit.json` and `captures.json` retain counters. Day/night contact sheets sample frames0/16/32 and were visually inspected: near mottling is reduced while distant material detail remains. These sampled stills do not prove absence of all temporal artifacts; the encoded videos are supplied for motion review, not claimed as fully watched by the automated inspection.

Run `node tools/experiments/capture-river-underlay-motion-20261022.mjs` with Vite on5190 to regenerate PNG sequences. Each video was encoded using two inputs with `ffmpeg -framerate 12 -i <baseline-dir>/%04d.png -framerate 12 -i <candidate-dir>/%04d.png -filter_complex hstack -c:v libx264 -crf 20 -pix_fmt yuv420p <output>.mp4`. The192 raw PNGs remain local/regenerable; only videos, contact sheets and metadata are committed for this sequence.

Recommendation: retain the candidate and completed lifecycle checks. Next resolve actual obstacle/water exclusion eligibility before native integration; do not expand the filter to other biomes indiscriminately. This does not establish the overall six-biome art goal.
