# Ordered smooth impostor candidate

QA prototype in the real Wild Engine campaign, Mangroves seed 712, media 1280x720, native deep-blue water/moss, distant impostors and mountain backdrop. Original art and authoritative geometry unchanged.

The candidate separates full coverage (>= .999) into an opaque depth-writing draw and partial coverage into a transparent front-sided draw. Both share a packed geometry view; partial instances are ordered far-to-near by view depth of the approximate billboard centre within each atlas batch. Shader coverage tests are complementary and precede atlas reads. No new textures.

Canonical instance arrays remain untouched. A separate reusable packed view follows source attribute versions and camera changes; unchanged input skips sorting/uploads. Readiness updates stay associated with the original identity. Preparation runs from scene.onBeforeRender, before Three.js visits objects and uploads attributes. Mesh.onBeforeRender would be too late.

## Evidence

- Input-order reversal: unsorted alpha changes 4018 daytime / 4010 nighttime pixels; ordered alpha changes **zero** in both phases.
- All restored images RGB exact; no reported page/WebGL errors.
- Each variant's original/reversed/restored draws have equal workloads. Ordered variant adds four calls and 2202 submitted triangles in this view (66/450871 -> 70/453073).
- Unit test checks canonical data preservation, depth order, readiness identity, unchanged-input caching and restoration of the original material/geometry.
- [Day comparison](day-comparison.jpg), [night comparison](night-comparison.jpg); before = dither, after = unsorted alpha, ordered = split/sorted alpha.
- [Static Intel UHD ABAB](../far-ordered-static-cost-20261022/README.md): daytime GPU +0.28/+0.47 ms; nighttime mixed. Retain for further optimization; not a speedup claim.

The initial load-failure.json is historical: GPU preparation compiled inactive clone materials before the shared alpha flag was enabled. The clone now provides its own coverage/alpha transformation, and the subsequent six captures complete successfully.

## Limits and next step

This is not globally sorted transparency: separate atlas batches may overlap in depth. Standby 3D alpha ordering is unchanged. Near/full alpha trees now write depth through the opaque impostor draw, which fixes that portion independently of list order, but arbitrary intersecting billboards and partially transparent batches remain to test.

The first prototype draws every impostor hull twice and rejects the complementary coverage in the fragment shader. It does not yet compact opaque and partial subsets. It also sorts/repacks all instance attributes on camera movement. The static benchmark intentionally does not prove this moving CPU/upload cost is acceptable. Measure moving preparation and cross-batch overlaps before native adoption; optimize the actual partial subset if justified. Input-order invariance alone is not proof of physically correct compositing.

Reproduce with WG_REVIEW_BIOMES=manglares and WG_REVIEW_OUT set to this directory:

```sh
node tools/experiments/capture-far-transition-ordered-20261022.mjs
python tools/experiments/audit-far-transition-order-20261022.py
node --test tests/qa-ordered-far-transition.test.js
```

No production/default changes; all additions stay in QA.
