# Underlay mask from selected grass anchors

QA prototype replaces broad terrain-only eligibility with a per-resident-chunk R8 texture rasterized from the capacity-limited selected draw lists. These lists already apply the real renderer water, path, slope, building and crop exclusions. Anchors with negligible height (<.05) do not contribute. No Engine queries, new geometry, draw calls or render passes; one extra ground shader mask sample.

97x97 samples at .5-unit spacing, .4-unit radial anchor stamps, linear filtering; this is an approximate influence mask, **not exact projected blade coverage**. The existing terrain/distance eligibility remains multiplied by the selected mask. Horizon is excluded by uGroundMapped. It does not establish collision-exact exclusion around every object, and filtering spreads influence beyond the stamp radius by interpolation.

Twelve real day/night frames compare approved baseline against selected-mask underlay; six paired poses have exact camera/time/calls/triangles and no captured errors. Day/night gameplay views were inspected: reduced substrate mottling and standing blades remain legible. Original ground/geometry/defaults unchanged. Initial development found shared uniform-object ownership across chunks; corrected to independent sampler uniforms before the retained captures. Final unit probe verifies separate texture ownership.

## Cost and limitations

25 resident masks =235,225 R8 data bytes, plus equal reusable CPU scratch storage (470,450 bytes total typed-array payload; excludes texture/driver/object overhead). No mipmaps. Dirty bytes are compared before GPU upload; unchanged masks do not upload. During the capture's127 selection updates, cumulative mask CPU work was294.3 ms,97 changed-mask uploads /912,673 data bytes. The day-pose update increments averaged roughly3.7–5.1 ms per selection; these are instrumentation observations during capture, **not a controlled frametime benchmark**. Some updates occur during loading/warmup. Prior underlay GPU results do not include this mask sample/build/upload cost.

This naive reconstruction is not ready for integration. Preserve the visual result and optimize the CPU path: reuse per-tile accepted-anchor rasterization and update only affected chunks/tiles rather than rebuilding all resident masks per selection. Exact selected-list tracking causes unnecessary work as the camera moves; any cached replacement must maintain capacity/exclusion correctness. A/B/A/B full-frame measurement and moving-camera video remain required after optimization.

The helper owns mask textures, releases evicted chunks on selection and clears them on coverage disposal, restoring fallback uniforms. A Node probe checks independent chunk uniforms, capacity truncation, empty-list clearing, unchanged-data upload suppression, eviction and disposal. It does not replace real gameplay placement/streaming tests or exercise all renderer lifecycle combinations. Masking can still change at selection boundaries; temporal stability is unproven.

## Reproduce

```powershell
node tools/experiments/test-selected-grass-mask-20261022.mjs
node tools/experiments/capture-river-underlay-selected-mask-20261022.mjs
python tools/experiments/audit-river-underlay-selected-mask-20261022.py
```

Vite at port5190. Helper: `qa-selected-grass-mask-20261022.js`. Baseline identifier `baseline-off` means filter off; grass remains enabled in both arms. Keep QA, do not merge or change native defaults yet.
