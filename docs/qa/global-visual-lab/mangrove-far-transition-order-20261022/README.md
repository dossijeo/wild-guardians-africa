# Mangrove impostor draw-order diagnostic

Actual Wild Engine world, seed 712, media 1280x720, full distant background and native blue water/moss. QA only; no production material changes.

Within one synchronous browser evaluation, draw the original scene, reverse every per-instance attribute of each impostor mesh, draw again, then restore and draw. Positions, identities, readiness, color inputs and geometry remain paired. No frame updates between these three draws. Day and night, original dither and candidate alpha.

| Phase | Dither changed pixels | Alpha changed pixels | Alpha maximum channel delta |
|---|---:|---:|---:|
| Day | 0 | 4018 | 153 |
| Night | 0 | 4010 | 79 |

All restored images are RGB exact. Calls and triangles equal within all four triplets; no reported browser/WebGL errors. This is an order-sensitivity diagnostic, not an FPS benchmark or proof that the reversed order is correct.

Alpha blending inherently depends on order. The current candidate disables depth writes for whole impostor batches, while their instance order comes from the tree list rather than camera depth. Consequently, the candidate lacks a robust depth-order solution. Front-face culling cannot solve this billboard composition problem. The visible effect is localized to the distant tree band; see [detail](day-order-detail.png).

Retain the smooth artistic direction. Before adoption, separate fully opaque coverage from partially transparent transitions and evaluate depth ordering for the partial subset. Measure any added submission/packing/overdraw cost. Do not simply reverse the list globally: correct order changes with camera and different atlas batches can overlap. Standby 3D trees need their own assessment; this test reverses only impostors.

Reproduce with WG_REVIEW_BIOMES=manglares and WG_REVIEW_OUT set to this directory:

```sh
node tools/experiments/capture-far-transition-order-20261022.mjs
python tools/experiments/audit-far-transition-order-20261022.py
```

Raw captures and audit.json retained. Default audit output targets this Mangrove diagnostic.
