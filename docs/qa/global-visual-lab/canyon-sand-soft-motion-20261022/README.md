# Soft Canyon sand: matched camera movement playback

240 rendered JPEG frames:60 original and60 soft per day/night. Seed918271, medium1280x720 per arm. Camera rises from16 to300 units above target with fixed horizontal offset and smooth interpolation. An initial lateral route crossed a cliff; it was replaced, not used for the delivered result.

Every one of120 pairs matches camera,target,time,calls and triangles. No captured errors. Both arms use the same optimized adaptive horizon. Simulation/visual time frozen; each pose settles chunks and horizon before capture. MP4s encode these frames at30fps for two-second playback. This is NOT a realtime30fps benchmark or a streaming-stutter measurement. GPU timings not recorded.

Left original, right soft. Keyframe review shows near detail retained and progressively lower distant patch contrast with remaining variation, day and night. This is evidence for the intended spatial transition, not proof of absence of every temporal artifact. Free camera motion, lower quality/resolution and sustained performance remain unverified. Keep candidate for opt-in native integration, default unchanged.

Delivered day/night MP4s, keyframe WebPs, camera/counter records, audit and SHA256 manifest. Source JPEG frames remain locally available and can be regenerated; not committed to avoid duplicating the encoded sequence.

Reproduce with Vite5190:
```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/capture-canyon-sand-soft-motion-20261022.mjs
python tools/experiments/package-canyon-sand-soft-motion-20261022.py
```
Packaging requires C:/ffmpeg/bin/ffmpeg.exe and Pillow. The broader six-biome quality target is still incomplete.
