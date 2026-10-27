# Loading cinematic night: haze and sky continuity

Real menu-to-game capture, seed712/Savanna/1280x720, loadingBeam=diffuse. Reproduce with WG_LOADING_FLOW_OUT pointing here and WG_LOADING_NIGHT=1 using `node tools/experiments/verify-loading-haze-cinematic-20261022.mjs`. Night uses a QA-only clock override to350 during loading, guarded until world state exists. This is presentation validation, not a campaign save-load test.

Original daytime investigation found an abrupt sky color change at world handoff. Night also exposed decorative mist stars disappearing at skyOnly. Production fix gradually returns cloned loading sky grading to the unmodified world sky and fades the mist during the upward camera phase. At skyOnly both reach the destination appearance. Interactive loading remains fully graded/fogged. No world sky materials or simulation changes.

Video transition-night.mp4 is assembled from actual canvas samples at10 Hz, with one-second holds on first/last frame, no AI imagery or interpolated frames. It is a review video, not a measurement of game FPS. Full sampled sequence and times are retained in cinema.json; readback introduces overhead. Inspected ascent, pre/post handoff and world reveal frames. Flow completes with diorama disposed, no lingering overlay or captured console errors. Ten existing cinematic/mist/sky tests pass, including reduced motion, cancellation and borrowed resource ownership.

No remaining abrupt grading/mist cut seen in inspected boundaries. Tests do not cover all biomes, portrait or all saved-world times. Underlying panorama star stretching near zenith is pre-existing and not fixed by this change.
