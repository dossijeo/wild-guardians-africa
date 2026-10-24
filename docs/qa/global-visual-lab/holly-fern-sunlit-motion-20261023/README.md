# Sunlit fern motion follow-up

Source e612c37df, native opt-in holly material, medium quality, seed 712, 1280x720, full far backgrounds. Existing native capture harness with no material substitutions. Each video contains 120 real rendered frames: 2 seconds fixed camera and 2 seconds lateral 3m out-and-back, wind sampled at 30 Hz. Day 150 / night 350, simulation paused at elapsed 2. This is offline sampling, not 30 FPS performance evidence.

Both videos decode to 120 frames / 4 seconds / 1280x720. All 240 frames have no recorded JS/shader/GL errors. First/last coverage is identical: 818 near + 1419 far in 25 chunks, both phases. Day frame 70 has pending far preparation; night has none. The largest adjacent-image difference occurs at frame 72 in both phases, during camera motion. This whole-image measure includes camera movement and cannot establish flicker absence. Frames 69–74 are provided in motion-peak.jpg and were visually inspected alongside the contact sheet: no obvious loss of coverage or white clipping in those sampled images. This is not exhaustive temporal-artifact certification, long-duration streaming or a new GPU benchmark.

Keep the brighter daytime fern lighting. It improves crown separation while maintaining shaded bases in the sampled moving views. The mockup has finer leaflets and brighter blue water; broad holly leaflets and the current water remain visible differences. Mangrove and the six-biome goal remain unfinished.

Reproduce from the lab worktree with Vite5190:

```powershell
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/holly-fern-sunlit-motion-20261023'
node tools/experiments/capture-holly-fern-native-motion-20261023.mjs
python tools/experiments/review-holly-fern-sunlit-motion-20261023.py
$motionRoot=$env:WG_REVIEW_OUT
foreach($phase in @('day','night')) {
 & C:/ffmpeg/bin/ffmpeg.exe -y -framerate 30 -i "$motionRoot/$phase/%04d.png" -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart "$motionRoot/$phase.mp4"
}
```

Raw PNG sequences are reproducible and left untracked; videos, metadata and contact sheets are committed. No production code changed in this validation pass. Next substantive art issue: Canyon distant water reflection bands, retaining the accepted banks and biome palettes.
