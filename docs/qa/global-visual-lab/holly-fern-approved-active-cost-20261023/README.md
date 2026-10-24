# Approved Mangrove art — active simulation cost

Source3a70902ee, Intel UHD0x9A60 / ANGLE D3D11,1280x720,medium,seed712. Native holly ferns,2048 shadows,production instance culling,full backgrounds. Two repetitions from the same saved world; day then night continuing each run. Camera oscillates8m,60warmup+90samples per separate GPU/cadence pass. No video recorder. Canonical Game module resumes the native app loop; no manual simulation ticks. Night/day clock advances normally. Ground material clock is held and vegetation clock remains sample-driven as in the preceding benchmark; this is an active-simulation workload test, not fully free-running visual validation.

| Time | GPU mean first/repeat ms | CPU render mean first/repeat ms | Frame interval mean first/repeat ms | Interval p95 first/repeat ms |
|---|---|---|---|---|
| Day |25.883/24.890|14.238/12.098|37.812/34.907|47.500/42.400|
| Night |31.000/27.477|17.326/15.079|39.420/37.618|52.600/46.400|

All360GPU queries valid, no recorded JS/GL errors or unexpected pauses, no coverage overflow. Worker records change; elapsed advances11.392/10.560s day and29.123/28.374s night. Actual scene evolves, so repeats have different workloads and are not equivalent-image A/B. Same initial day state and per-frame camera coordinates verified. Night continues its own day state. Whole-frame mean triangles~1.30–1.35million and calls187–225, above the paused baseline; cannot attribute all added cost to simulation computation or to shadows without draw attribution. CPU timing covers world.render, not the separate simulation update. Frame intervals cover app cadence including other work; do not add CPU and GPU times.

The medium profile does not demonstrate a stable30fps budget in this scenario (means34.9–39.4ms); it remains artistically approved. No quality reduction made. Night endpoint screenshot inspected: approved coverage and color retained. This is not a long campaign, a streaming excursion, or a thermal stability test.

Reproduce: node tools/experiments/measure-holly-fern-approved-active-20261023.mjs, then python tools/experiments/audit-holly-fern-approved-active-20261023.py. Vite5190 required. Default two cards repetitions,medium. Source and artifacts retained for subsequent optimizations.

## User-directed next experiment: composite fern LOD

User proposes keeping current foreground fronds and replacing distant masses with a less detailed composite texture, accounting for top-down views. Code inspection confirms continuous-grass.js already partitions near/far instance buffers, but applyHollyFern assigns the same fernClumpGeometryData (32triangles) to BOTH meshes. Thus the current fern integration does not obtain the intended near/far geometry saving. This is a real optimization opportunity, not proof of speedup.

Next candidate should bake a composite of the approved source fronds with alpha and normal information, preserve coverage/occupancy masks, reuse existing selection and buffers, and choose representation using projected size plus camera inclination. Validate close/game/elevated/top-down day/night and transition motion. Keep approved native variant as control. Do not thin vegetation or remove shadows to simulate a gain; account for shadow draw cost and possible alpha overdraw. No candidate is promoted by this report.
