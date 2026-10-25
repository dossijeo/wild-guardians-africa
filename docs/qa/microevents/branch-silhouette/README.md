# Focused falling-branch silhouette review

Baseline: `cd6c9af0d350ff1f79cd9a1dea0da0786eca4e2a` (remote main, 2026-10-21). This small visual change builds on merged #188, #197, #198 and #205. It does not replace those improvements or claim a new polish pass across the whole catalogue.

## Audit and retained change

`audit-before.webp` shows ten remaining events at native screenshot scale: ants, branch, burrow, debris, dustdevil, grain, hail, heat, insects and web. All ten spawned without page errors (`audit-results.json`).

- **Branch:** the previous mostly straight intersecting rods looked like crossed timber. The retained baked model has a bent, tapering trunk, irregular fork, two leaves and a light broken end. The change is subtle at the normal game camera, but makes the silhouette more organic in both daylight and night.
- **Dustdevil:** repeated lobes still resemble beads. The four rejected dust experiments documented on `codex/microevents-atmosphere-readability` (`5ec6b942f`, `docs/qa/microevents/dust-readability/README.md`) were reviewed and not repeated or adopted.
- **Ants and insects:** anatomy remains small at gameplay scale. Increasing their silhouette would risk making a crowded trail/swarm heavier; no change was selected without stronger evidence.
- **Burrow, debris, grain, hail, heat and web:** preserve the existing readable silhouettes. No cosmetic change solely to expand this pass's scope.

Only atlas cell **59** changes visible pixels (957 pixels). All other cells retain their alpha and visible RGB; fully transparent RGB may be recoded by lossless WebP. Branch nontransparent coverage changes from 534 to 693 pixels in its 64×64 cell. The full 512×512 atlas grows **70,364 → 70,760 bytes (+396)**. Additional authoring geometry is baked offline.

No runtime source, event definitions, animation frames/timing, hitboxes, mechanics, balance, camera or simulation changes. Instance capacity, shader, texture dimensions and batching are unchanged.

## Real-game comparison

- `day/comparison.webp`: original left, candidate right.
- `night/comparison.webp`: same comparison under actual night lighting.
- Both directories include full frames and `captures.json`; these are real Chrome/WebGL screenshots, not mockups. The atlas is swapped inside the same frozen scene. Comparison sheets are lossless; full frames use WebP quality 86.

Existing `?qa-microevents&qa-microevents-fixture=wood` fixture, seed 178, 1280×720 viewport, normal camera, particle age 0.75 s. The day-only branch is spawned at a valid clock time before setting development time to 310 for the night contrast test; event eligibility is unchanged. Night is a presentation stress test, not a new nighttime event.

Both A/B comparisons retain **76 full-scene draw calls and 1 microevent instance**, with identical triangles within each pair and no page errors. Separate sessions can have different scene triangle totals. `gestures.json` records completion of the real primary brush gesture without the hold fallback.

## Performance and limitations

Chrome uses Intel UHD through ANGLE/D3D11. `benchmark.json` contains 240 alternating samples per atlas in a frozen branch scene; `renderer.render + gl.finish` measures CPU submission plus GPU completion, not pure GPU time. Initial median/p95: baseline **2.8 / 63.4 ms**, candidate **2.9 / 72.5 ms**. The broad tails motivated a counterbalanced control test rather than a performance-equivalence claim.

`control-benchmark.json` uses ABC/CAB/BCA order, with C restoring original branch pixels into a separate copy of the candidate atlas. Each arm has 120 render samples and 180 real rAF intervals:

| Arm | Median render + finish | p95 render + finish | Mean presentation FPS |
| --- | ---: | ---: | ---: |
| A: original | 1.6 ms | 3.1 ms | 33.62 |
| B: candidate | 1.3 ms | 3.5 ms | 33.20 |
| C: original branch control | 2.1 ms | 3.3 ms | 32.12 |

The initial median increase does not reproduce; variation also affects the identical-art control. These results do not establish a speedup, tight equivalence or live campaign FPS. No extra runtime work or quad area is introduced, but the branch's opaque pixel coverage is modestly higher. This review covers one GPU, fixture and camera, not every biome, zoom or device.

## Validation and reproduction

84 directed tests pass across the five microevent test files, including all-event projected interactions and rendering immutability. Asset provenance verification passes. Production build passes with the existing mixed-import and large-chunk warnings. Both changed experiment scripts pass `node --check`.

Set `WG_QA_PLAYWRIGHT_MODULE` to an installed Playwright `index.mjs` and `WG_QA_URL` to a running Vite server. Temporarily save the baseline `public/content/microevents/atlas.webp` as `atlas-before.webp` beside the candidate; remove it before building or packaging.

```text
node tools/experiments/render-microevents-atlas.mjs
node tools/experiments/patch-microevent-branch-art.mjs
node tools/generate_microevent_assets.mjs
node tools/experiments/capture-microevent-atlas-pairs.mjs docs/qa/microevents/branch-silhouette/day branch
node tools/experiments/capture-microevent-atlas-pairs.mjs docs/qa/microevents/branch-silhouette/night branch night
node tools/experiments/benchmark-microevent-atlas.mjs docs/qa/microevents/branch-silhouette/benchmark.json branch
node tools/experiments/benchmark-microevent-atlas-control.mjs docs/qa/microevents/branch-silhouette/control-benchmark.json branch 59
```

The control tool's optional event/cell arguments preserve its previous raincloud/17 defaults. The patch tool retains baseline pixels outside cell 59 so a full authoring rebake cannot overwrite earlier reviewed art. This change is for review; do not merge automatically.
