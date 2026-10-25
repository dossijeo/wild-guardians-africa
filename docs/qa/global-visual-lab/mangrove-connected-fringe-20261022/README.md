# Connected dense leaf shoulder candidate

QA successor to additive-fringe. Same spatial noise and acceptance threshold, but effective shader wear is max(0,wear-fringe) for every accepted root, instead of assigning full size only to additions. This monotonically preserves/increases the original growth and keeps the expanded shoulder attached to the old cover. Pigment, geometry, shadow response, placement grid, water/object exclusions and underlying ground masks unchanged. No native integration.

Reproduce first capture-mangrove-additive-fringe-20261022.mjs, then capture-mangrove-connected-fringe-20261022.mjs, then compare-mangrove-connected-fringe-20261022.py. Original PNG folder is copied from the first experiment, with its original records reused; current script captures only the successor. Both use early pause, seed712/media/full backgrounds, identical camera/time/origin. No active-play equivalence claim.

12 compared pairs (warmup/final, day/night, close/game/reverse), no recorded errors or overflow. The candidate adds 125/179/180 selected module instances and 4368/5160/6336 triangles in close/game/reverse, for both phases. Same draw passes; this does not prove same GPU cost. Monotone acceptance retains original roots by construction, but these aggregate records are not a per-root identity audit.

Close/day, game/day and close/night inspected. Leaf size, dark-light separation and dense appearance are retained. Added fringe now connects to the dense cover; the detached bands of the first attempt are gone in inspected views. The edge is less regular, but broad straight regions remain at gameplay scale. Keep as candidate, not complete or approved. Full-size leaves extend farther into the low-wear shoulder; path cores above .42 and water/object exclusions stay clear by the algorithm, but moving-camera path clearance needs review. Benchmark GPU/CPU and streaming before native selection. Selected original recipe unchanged.

## User selection clarified

The user explicitly chose the LEFT image: original dense leaves. The additive right-side candidate is not selected. An uncommitted native additive option was briefly prepared after misreading the selection, then removed immediately when clarified. Preserve original recipe, density, color and boundary treatment as the approved reference. Connected fringe is likewise not selected.
