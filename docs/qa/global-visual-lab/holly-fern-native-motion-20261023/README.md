# Native fern motion review

Native opt-in `mangroveFerns=holly`, medium quality, seed 712, 1280x720. Actual 2048 solar shadows, balanced moss, full distant impostors/background. No material or geometry replacements in the capture harness.

- [Day video](day.mp4), [night video](night.mp4), [contact sheet](contact-sheet.jpg).
- Each clip contains 120 real renderer frames sampled at 30 Hz: two seconds fixed camera followed by a smooth three-metre lateral arc returning home. Wind time advances; simulation remains paused at elapsed=2.
- Videos are offline sampled, **not evidence of 30 FPS performance**. Browser capture and encoding are excluded from the separate benchmark.
- 240 frames: no recorded JS/shader/GL errors. Day frame 70 reports pending far-background preparation; all other frames report none. Adjacent frames 69/70/71 are retained in [a separate comparison](background-preparation.jpg); no obvious missing fern region appears in those inspected images. Consequently this is not a claim of perfectly settled background throughout the movement.
- Start/end fern counts match: 818 near + 1419 far, 25 resident coverage chunks. Counts vary with view selection during the arc. No disappearance of the fern layer in the inspected contact-sheet frames. Contact-sheet inspection alone does not certify the absence of every temporal artifact.
- The original mockup remains finer and lighter in its individual fronds. The selected holly asset has broad leaflets; do not label the images equivalent or this biome complete.

Reproduce with Vite on port 5190:

```powershell
node tools/experiments/capture-holly-fern-native-motion-20261023.mjs
$motionRoot='docs/qa/global-visual-lab/holly-fern-native-motion-20261023'
foreach($phase in @('day','night')) {
  & C:/ffmpeg/bin/ffmpeg.exe -y -framerate 30 -i "$motionRoot/$phase/%04d.png" -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart "$motionRoot/$phase.mp4"
}
```

Raw PNG frames are reproducible and not committed; metadata, clips and contact sheet are retained. This short resident-camera path complements the separate streaming/rebase and quality-roundtrip checks; it is not an active-campaign or long-duration leak test.
