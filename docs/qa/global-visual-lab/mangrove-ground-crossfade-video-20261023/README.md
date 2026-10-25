# Real canvas recordings of material cache replacement

Two WebM/VP9 recordings at 1280×720 use the same 180-render camera path: atomic `incremental` and blended `incrementalsmooth`. They are captured separately from the controlled cost benchmark; recorder overhead makes these cadence measurements unsuitable for performance claims.

- Atomic: 151 encoded frames, duration 5.694 s, 180 render observations over 5.901 s; no retained targets/transitions.
- Smooth: 160 encoded frames, duration 5.868 s, 180 render observations over 6.107 s; 28 transition observations, 23 strictly intermediate weights, maximum one retained previous target during recording.

The smooth recording therefore exercises real shader interpolation, not merely an enabled flag. The contact sheet was inspected for gross artifacts and preserves the scene, ground color and fern cover. It does not prove every change is imperceptible. Initial publication and detail withdrawal remain atomic; these are still open work.

MediaRecorder captures at a requested 30 FPS but skips/coalesces render observations. Clips are not frame-synchronized and the encoded durations differ. Do not treat them as pixel-aligned A/B videos or infer frame pacing from their encoded frames. The JSON logs preserve render timestamps, camera positions, active transition weights and retained-target counts. `video-validation.json` records ffprobe output.

Reproduce with the hybrid harness: WG_VARIANT_SEQUENCE=incremental,incrementalsmooth; WG_PHASES=day; WG_COVER_QUALITY=media; WG_VIEW=normal; WG_MODES=cadence; WG_SAMPLES=30; WG_WARMUP=30; WG_CAPTURE_MATERIAL_TRANSITION=1; output this folder. Clear WG_DRAW_CENSUS and WG_FRAME_STEP. Always disable video capture for decisive benchmarks.

Perceptual acceptance, low/night/elevated views and the remaining transition paths are not closed. Keep PR #159 draft.
