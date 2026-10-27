# Adaptive Canyon horizon: fine visual reference with localized density

QA-only builder samples the same spatial surface. Cells inside river edges plus an80-unit margin use2x2 spacing; elsewhere4x8. Every cell collects shared edge vertices; transition cells use a center fan. Resident rectangle boundary retains1-unit vertices. Water buffer is reused from native horizon; simulation/navigation unchanged.

Twelve real campaign captures, seed712, medium1280x720, three same cameras day/night. Both baseline and candidate use smooth normals. Six candidate images are pixel-identical to the full2x2 reference in canyon-horizon-grid-20261022 (fine-reference-delta.json). This proves equivalence only for these views; elevated/off-axis/different seeds remain pending.

Actual captured horizon vertices:227328–229464 versus802656 full fine and103212 original. About71–72% fewer than full fine. Additional scene triangles versus original:41372–42084, down from233148. Calls unchanged43/39/51. Nominal terrain payload about8.2 MB versus28.9 MB full fine; not driver VRAM measurement. No GPU timing or FPS claim.

Independent topology audit at three origins: zero interior open edges and zero edges with more than two incident triangles; outer and resident boundaries allowed. Spatial metrics and selected chunk remain unchanged. Audit builder time559–749 ms in Node, not browser streaming or comparable backend benchmark. Prototype deliberately retains native horizon generation to reuse water and uses JS maps/arrays; do not deploy this construction path without optimization and moving-camera latency testing.

Recommendation: retain candidate. It preserves the desirable fine-grid appearance in tested views with substantially less geometry. Still does not solve remaining bank steps or every resident/horizon transition. Next validate other angles/seeds and make generation practical, preserving conforming edges.

Reproduce (Vite5190):
```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/capture-canyon-horizon-adaptive-20261022.mjs
python tools/experiments/package-canyon-horizon-adaptive-20261022.py
node tools/experiments/audit-canyon-adaptive-horizon-20261022.mjs
```
No production renderer density change. Captures fail if the worker/horizon disappears, guarding against the earlier invalid fine-grid trial.
