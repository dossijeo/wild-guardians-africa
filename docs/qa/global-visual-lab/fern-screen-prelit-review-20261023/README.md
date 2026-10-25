# Screen-size LOD + precomputed fern lighting/shadows (QA)

Source e538f1341. Native approved near32triangle fronds; far8triangle raised prelit composite plus2triangle ground shadow. Same atlas/material limitations as fern-prelit-far-review-20261023. Only QA source routing changes selection; production remains untouched.

Projected diameter proxy uses2m module and camera-space depth at actual drawing-buffer resolution. Initial threshold64px; retain detailed until below60px and retain composite until above68px. WeakMap uses persistent cached instance records; no allocations of histories per frame. Existing candidate distribution, horizontal far cutoff, masks, culling and capacity unchanged. Behind-camera roots conservatively retain detail; nearDistance0 quality retains far-only behavior. Hysteresis reduces threshold chatter but does NOT implement a smooth geometric transition. Tile regeneration resets associated history.

Sixteen screenshots, seed712,1280x720,medium, full distant backgrounds, settled paused real scene. Same camera/target/time/origin and total instance count for each pair; no errors. Before reset correction, history from previous daytime camera path changed nighttime close/game selection. Fixed by resetting QA history at each phase start, then repeated candidate captures. Final day/night near/far counts match. Native screenshots were freshly captured; native metadata restored from identical baseline capture records after candidate-only rerun. No new changes to simulation.

| View | Native near/far | Candidate near/far | Native final-pass triangles | Candidate triangles |
|---|---|---|---:|---:|
| Close |818/1419|1248/989|334495|312737|
| Game |978/1524|1209/1293|392455|364009|
| Reverse |301/2029|658/1672|385522|348738|
| Topdown |2068/1792|0/3860|284065|199145|

Day/night totals same. +1final color call oblique; topdown same38calls. These are final world-pass counts, NOT whole-frame GPU savings. Compared with horizontal prelit LOD, screen selection uses MORE detailed fronds in oblique views, and fewer in topdown. This is appropriate to size, not guaranteed faster.

Inspected close-day and topdown-day/night side-by-side images (native LEFT). Close foreground maintains original frond silhouette; topdown retains dense coverage but composite differs in crown lighting, shadow shape and fine frond structure. It is not pixel-equivalent or user-approved. Static images do not establish transition quality. Existing composite lacks external-object shadow reception, native wind on replaced near fronds, physical day/night interpolation and dynamic individual shadows. Do not promote based only on triangle reduction.

Reproduce: node tools/experiments/capture-fern-screen-prelit-20261023.mjs; python tools/experiments/review-fern-screen-prelit-20261023.py. Full raw captures local; paired images and JSON retained. Topdown moving-camera ABAB benchmark in ../fern-screen-prelit-topdown-cost-20261023, deliberately separate from normal-view prior benchmark. Continue preserving approved native art.
