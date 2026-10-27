# Ground/fern separation

Medium, seed712,1280x720, same three camera poses and day/night times, actual2048 solar shadows, full distant impostors/mountains. Open fern geometry, density, colour, masks and water unchanged.

Strong restraint: moss base/normal/ARH gradient footprint x2 (one mip level), normal amplitude x.65. Reduces ground competition but blurs moss too much; rejected as final art.

Balanced candidate: gradient footprint x1.35 (about .43 mip levels), normal amplitude x.8. Retains surface definition while making crowns/shadows easier to distinguish. Keep for combined review, not a default. Both moss scales filtered consistently; underlying soil/shore masks intact. Applied after moss/substrate composition to preserve required shader anchors. Initial pre-composition patch failed; strong variant load-failure.json records that failed attempt before successful corrected captures.

12 successful new captures: camera/target/time, visible calls/triangles match 2048 baseline, no captured shader/JS/GL errors. Strong variant resource counts match; balanced day has one extra resident geometry in each view, textures equal, night resources match. Cause unresolved; no equal-memory claim. Same lookup count, no new render passes or drawn geometry; filtering/cache costs can differ. No new timing benchmark; previous resolution results cannot be relabelled as this combination's cost.

Comparisons use untouched renderer captures. Still unlike mockup: holly leaflets broader, water darker, distant layout different, weaker fine-frond separation. Not equivalent artwork or completed biome. No density thinning, default changes, main or simulation edits.

Reproduce with Vite5190, WG_CARD_TREATMENTS=cards:
node tools/experiments/capture-holly-fern-ground-balanced-20261023.mjs

Next: expose selected combination through native opt-in recipe, then motion/streaming and combined cost validation. Avoid accumulating further subtle QA-only variants before this integration gate.
