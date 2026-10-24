# Canyon native calm water: active 144m excursion

Source e5493bb33. Native canyonWater=calm, medium1280x720, seed712, populated paid campaign fixture. Each phase40wall seconds,144m along Z and back, terrain-aware camera clearance and target, held existing manual raid-camera mode. Actual Game.advanceReal remains active; no direct QA ticks. Onboarding skipped in QA to prevent tutorial pause. Day starts150/night350; night continues changed day state.

## Evidence

Day1344 observed frames,31distinct chunk sets,render origin(-48,144)→(-48,288),55frames pending distant preparation. Night1243frames,39chunk sets,57pending,origin remains(-48,288). Exact X/Z camera path checked against requested per-frame shift. No recorded JS/shader/GL errors or unexpected pauses. Workers changed in both phases; simulation elapsed advanced39.6096/107.8753 respectively (native live time progression, not assumed1:1). Night time checkpoints350→457.875 remain day1. Streaming runs during capture; this is not a benchmark.

Videos decode at1280x720: day1339frames39.903s/night1238frames39.911s. Recorder/checkpoint overhead and dropped frames prevent FPS claims. Resource ranges vary with chunks: day100–158geometries79–95textures; night114–146/83–93. This is not proof of long-duration leak freedom or exact resident-memory return.

Day farthest-point full image and day/night contact checkpoints reviewed. Water/banks remain continuous in these sampled views, no obvious layer disappearance on origin change. Pending work occurred, so do not claim the background was settled throughout or all temporal artifacts absent.

## New visual issue / next work

At the distant part of the route, several rock props appear suspended against or embedded in the Canyon walls (especially day-4.png). This is an observed issue, not yet attributed to the new water option or a proved regression. Inspect renderer placement/slope handling against terrain before adjusting anything; preserve authoritative simulation/navigation and original model silhouette. Canyon is not artistically complete just because the streaming audit passes. The next useful work is to isolate this placement defect rather than repeat static water comparisons.

## Reproduce

Vite5190: node tools/experiments/capture-canyon-calm-excursion-20261023.mjs; python tools/experiments/audit-canyon-calm-excursion-20261023.py docs/qa/global-visual-lab/canyon-calm-active-excursion-20261023. Full metadata, checkpoint PNGs, contact sheets and WebM retained. No production code or main changes in this pass.
