# Fresh global sky review over V11 composition

Revalidated the existing combined artistic composition on the current branch with fresh baseline/sky pairs for Sabana, Gran Rio and Gran Canon. Ground-shadow-fill has no live node process and its selected implementation is already in global-lighting; do not restart the historical trial.

Reproduce: WG_REVIEW_BIOMES=sabana,gran-rio,gran-canon then node tools/experiments/capture-global-sky-paired-20261022.mjs; python tools/experiments/package-global-sky-paired-20261022.py. Vite 5190, seed 712, media, 1280x720, fixed visual time, paused real campaigns. Three camera poses, day/night, two variants: 36 images / 18 pairs. Every pair has identical camera, target, time, draws and triangles. No console/GL/network errors. This is not a timing benchmark.

Visual inspection: Sabana reverse view gains a bluer, clearer horizon while the grass and shadows remain prominent. Elevated views largely exclude sky and gain little. Canyon ground and river occupy nearly the entire frame; sky grading cannot improve the perceived relief there. Keep the candidate for broader sky validation, but do not claim a global ground improvement from these pictures. The current compositions still use the V11 QA coverage/material adapters; they are not yet a fully native global preset.

Next evidence required: inspect Canyon floor/shore material scale against the actual reference, then complete the other three biome comparisons before any global sky promotion. Keep the approved Desert mesorelief and the attractive Mangrove variants. No rendering code or main branch changes in this pass. Loading polish is not a substitute for finishing the six-biome goal.
