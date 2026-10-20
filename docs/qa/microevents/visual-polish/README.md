# Focused microevent art polish — 2026-10-20

Before captures: `../main-integration/{wood-termites,wet-fireflies,rocks-fallingdebris}.png`.
After captures: the same filenames in this directory. These are real Chrome / ANGLE Intel UHD D3D11 captures at 1280×720 using the existing development fixtures, not mockups. Event positions vary slightly with elapsed time.

The atlas retains its original procedural low-poly authoring, resolution and slots. Only firefly (cell 1), termite (16), and fallingdebris (60) change: a raw RGBA comparison found 1,005 / 913 / 973 changed pixels respectively, and zero changes in the other 61 cells. `atlas-before.png` preserves the original for inspection; the updated source is `assets-source/microevents/lowpoly-atlas.png`.

- Fireflies now have a compact luminous abdomen framed by a dark thorax and shorter translucent wings. A smaller, quieter halo leaves individual silhouettes legible instead of pooling into a pale haze. The nighttime capture visibly retains distinct light points.
- Falling debris has uneven chipped planes and a warm stone palette. Deterministic presentation scale/aspect variation reduces the repeated identical polyhedron appearance. The canyon capture confirms variation with readable facets.
- Termites have a narrower pale abdomen, dark head and broader dark legs. Their presentation turns horizontally with a small phase variation, giving the trail an insect silhouette instead of a row of upright beige beads. The final wood capture visibly separates them from the palisade without increasing their size; individual anatomy remains small at the normal camera distance.

Runtime retains the same single instanced mesh and instance counts: 18 termites, 36 firefly instances including halos, 9 rocks. No extra draw calls or textures, no new animation update, no physics/interaction/economy changes. Source geometry complexity is baked offline into the atlas.

Validation:

- `node --test tests/microevent-billboards.test.js tests/microevent-interactions.test.js`: 24 passed, 0 failed, including all forty events through projected touch ownership.
- `tools/experiments/check-microevents-main-browser.mjs docs/qa/microevents/visual-polish`: all three primary gestures completed without hold fallback, no page errors, no HTTP errors. See `results.json` for exact observations.
- Atlas rendered through the existing browser authoring page, then compressed with `node tools/generate_microevent_assets.mjs`.

This focused review covers three representative fixtures and the full atlas, not every biome or a new whole-game performance benchmark. Original content outside the three atlas cells is preserved.
