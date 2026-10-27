# Six-biome review of ordered smooth far transitions

Real Wild Engine campaigns, seed 712, Mapungubwe, media 1280x720. Native distant impostors and 2D mountain backdrops enabled. Three fixed views (game/elevated/oblique), day 150 and night 350, paused simulation and fixed visual clock. Warmup traversal, original, ordered smooth, return in one world per biome. No production/default changes.

[Day overview](overview-day.jpg) / [night overview](overview-night.jpg). Detailed before/after sheets: [Sabana day](sabana-day-comparison.jpg), [night](sabana-night-comparison.jpg); [Gran Rio day](gran-rio-day-comparison.jpg), [night](gran-rio-night-comparison.jpg); [Mangroves day](manglares-day-comparison.jpg), [night](manglares-night-comparison.jpg); [Desert day](desierto-day-comparison.jpg), [night](desierto-night-comparison.jpg); [Volcanoes day](volcanes-day-comparison.jpg), [night](volcanes-night-comparison.jpg); [Canyon day](gran-canon-day-comparison.jpg), [night](gran-canon-night-comparison.jpg).

## Visual result and scope

The candidate removes dotted coverage on transitioning trees most clearly in oblique Sabana, Gran Rio and Volcanoes views. Mangrove crowns remain integrated with the retained moss/blue water. Desert dune relief and shadows are visually retained. Elevated views mostly show no visible change while still paying the additional submitted geometry; no claim of a benefit everywhere.

Canyon has almost no far vegetation in this region and shows no demonstrated artistic benefit from this transition change. The few changed pixels are comparable to control differences. This is a sparse-scene compatibility check, not a strong Canyon foliage validation. Mountain objects are enabled but the canyon walls naturally hide much of the skyline.

No reported page/WebGL errors in 144 PNG captures. Thirty-one of 36 before/return images are RGB exact. All before/after triangle deltas equal the explicitly added impostor pass:

| Biome | Added calls | Added submitted triangles |
|---|---:|---:|
| Sabana | 4 | 3544 |
| Gran Rio | 4 | 4184 |
| Mangroves | 4 | 2202 |
| Desert | 4 | 1012 |
| Volcanoes | 4 | 2616 |
| Canyon | 1 | 4 |

The original QA extraCalls counter counted visible meshes even when their instance count was zero. Canyon therefore reports expectedExtraCalls=2 in raw logs despite only one real added draw. Its first adapter has no tree entries; the other contributes one billboard. The capture script now excludes empty batches. Raw logs and the six flagged counter differences remain intact rather than silently rewriting evidence.

## Control limitations

Sabana game-view returns differ by 1470/2201 pixels in a small trunk fragment touching the top edge, and add one draw / 4937 triangles relative to the initial reference. This is a changed representation workload, not an isolated material comparison. Before/after workloads do match the intended added pass. Gran Rio, Mangroves and Volcanoes have six exact return images each.

Desert has one changed return pixel in two daytime views; Canyon has eight in one nighttime view. The [immediate draw control](../far-transition-direct-control-20261022/README.md) removes world-frame updates between variants: Sabana returns exactly, while tiny Desert/Canyon edge differences remain. Do not label all captures exact or infer a universal temporal guarantee.

This static survey is not a new performance benchmark. Measured Intel UHD cost remains scoped to [Mangrove static](../far-ordered-static-cost-20261022/README.md) and [moving](../far-ordered-moving-cost-20261022/README.md) tests. Cross-atlas partial overlap and standby ordering limitations remain documented separately. No broad FPS claim.

## Recommendation

Retain the ordered smooth candidate and move toward an opt-in native integration with resource-lifetime checks, rather than further marginal packing-cache work. Preserve the existing original path for review. Verify near-tree handoffs and low-quality modes during integration; inspect dense partial overlaps. Main remains untouched.

The full-scene review also shows the Gran Rio distant water is still brighter/turquoise compared with nearby regional water; that needs a separate color-integration pass. Do not use DOF to conceal it. Mangrove rectangular ground-leaf patterns remain queued after the current background integration, per the user's priority.

Reproduce with WG_REVIEW_BIOMES=sabana,gran-rio,manglares,desierto,volcanes,gran-canon:

```sh
node tools/experiments/capture-far-transition-six-biome-20261022.mjs
python tools/experiments/audit-far-transition-six-biome-20261022.py
```

The matrix audit reports residuals and validates capture completeness/background/camera/error prerequisites; its successful exit does not assert every return is RGB exact. Raw records and audit.json retained.
