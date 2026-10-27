# G trial rejected: filtering and lateral masonry

**Retain F (`village-details`). G does not provide a clear artistic improvement. Stop this pass without integration or generalization.** No runtime asset or flag was added; the trial texture is stored only here as evidence.

## What was tried in Blender

The trial keeps E/F's exact geometry, UV and 2048 x 2048 atlas. It adjusts the existing rear sun rays, painted-door motif and lower friezes using an edge transition based on each triangle's world-space texel footprint. It also paints 351 selected lateral masonry faces with two restrained broad washes and 10% original pigment. Pots, porch wood, roof and arch paint are excluded from that lateral selection. Motif positions, geometry, silhouette and neighbours are unchanged.

The editable `workshop-patina.blend`, standalone authoring script and `detail-audit.json` retain the selections. This is an authored texture trial, not recovered detail. The lateral treatment deliberately introduces no new stone joints or arbitrary noise.

## Why it fails

- Rear rays become softer rather than clearly cleaner; a few distorted UV triangles develop conspicuous transition bands. Filtering an elongated texel footprint with one scalar width is inadequate. Across the selected rear panel faces, the nominal ray width is only 2.54 texels at the median (10th/90th percentiles 1.58/3.28). This Jacobian estimate is not weighted by actual ray coverage. Mips and game-camera distance reduce the available detail further.
- The lower friezes do not gain enough legibility to justify replacing F. Existing fragmented UVs remain the limiting factor; more filtering is not more source resolution.
- The long masonry side turns into a flat dark strip at medium distance. Much of its apparent block structure was painted rather than represented by distinct geometric courses. Suppressing the old colour without carefully reconstructing those original joints removes useful identity. At the porch, the quiet areas also contrast badly with the remaining soft corner facets.
- Night hides fine artefacts but preserves the flat-strip regression. That is not evidence of a successful material pass.

The appropriate next technique, if resumed in a separately scoped task, would be continuous dedicated charts for the rear motifs plus a manual reconstruction of the existing stone joints from the source. It would require proving where the chart space comes from without degrading the roof/arches or neighbours. This trial does not demonstrate that allocation or justify a larger atlas. The extra atlas cost remains unresolved.

## Real renderer comparison

Ten Chrome WebGL captures cover rear, facade, awning, medium and neighbour, day and night. All camera/target values match the F records in `../workshop-details/detail-captures.json`; source times remain 150/350 and viewport 1280 x 720. The files retain the `village-details-*` prefix because the harness intercepts only F's colour request with G's local texture. Each record explicitly includes `textureOverride`. Compare each image here against the same filename in `../workshop-details/`.

Medium includes the scene; close views isolate the unit diagnostically. The neighbour control is pixel-identical to F in both lighting states. These are game-renderer fixtures, not campaign or performance evidence.

## Cost and validation

G WebP is 710,792 bytes, 2,166 more than F. Combined with the reused 429,056-byte E binary it would cost 1,139,848 extra asset bytes versus original A. Its estimated RGBA8 mipmapped atlas allocation remains 21.33 MiB above A and unchanged from F. Material and geometry counts are structurally unchanged; no measured draw-call or CPU/GPU improvement is claimed. No benchmark was run because the visual trial failed and the parent was profiling the engine.

The capture script passes `node --check`; all six village invariant tests pass. No runtime code changed, so the successful F production build remains the relevant build check. Original assets and F's runtime texture were not overwritten.

## Reproduction

1. Run Blender headless with `tools/experiments/blender-paint-workshop-patina.py`.
2. Encode `mapu-0-color-patina.png` as WebP quality 95, effort 6 in this evidence folder.
3. Run `capture-workshop-finish.mjs` with `WG_ART_VARIANTS=village-details`, `WG_ART_VIEWS=rear,awning,facade,medium,neighbor-close`, `WG_ART_OUTPUT=docs/qa/global-visual-lab/workshop-patina`, and `WG_ART_TEXTURE_OVERRIDE=docs/qa/global-visual-lab/workshop-patina/mapu-0-color-patina.webp`.

The override is confined to the test browser request. It is not a shipped runtime feature. The capture helper rejects overrides for variants other than F.
