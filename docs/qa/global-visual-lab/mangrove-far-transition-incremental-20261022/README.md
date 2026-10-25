# Incremental packing visual controls

Real Mangrove campaign, seed 712, media 1280x720, full background/native blue water/moss, daytime and nighttime. Full and incremental packing produce **RGB-exact original images in both phases**. Reversing canonical instance input order and restoring it also produces exact images in all four mode/phase triplets. No reported GL/page errors; equal draws/triangles within each triplet.

Same shaders, same ordered opaque/partial representation; only packing invalidation differs. This tests a cache, not a new art variant. See [benchmark and non-adoption decision](../far-incremental-moving-cost-20261022/README.md). Cross-atlas partial overlap limitations of the underlying candidate still apply.

Reproduce with WG_REVIEW_BIOMES=manglares and WG_REVIEW_OUT set to this directory:

```sh
node tools/experiments/capture-far-transition-incremental-20261022.mjs
python tools/experiments/audit-far-transition-order-20261022.py
```

PNG originals/reversed/restored, captures.json, audit.json and parity.json retained.
