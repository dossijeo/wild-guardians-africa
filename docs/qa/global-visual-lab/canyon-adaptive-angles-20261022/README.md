# Adaptive horizon: second seed, close lateral/elevated views

Seed918271, medium1280x720, three poses day/night, full2x2 vs optimized adaptive. All six pairs pixel-identical and same camera/time/calls. Twelve real campaign captures, no errors, horizon worker metadata required.

These closer views mostly show resident terrain and the fine river corridor. Exact agreement is a regression check, not proof of horizon transition quality. The wider follow-up in ../canyon-adaptive-wide-20261022 exposes those regions. No performance claim; production unchanged.

Reproduce with Vite5190 and WG_REVIEW_BIOMES=gran-canon: node tools/experiments/capture-canyon-adaptive-angles-20261022.mjs; then python tools/experiments/package-canyon-adaptive-angles-20261022.py.
