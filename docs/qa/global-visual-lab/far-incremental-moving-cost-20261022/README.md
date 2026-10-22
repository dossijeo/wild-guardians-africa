# Incremental packing trial: small local benefit, no adoption

One-world ABAB full packing / incremental packing, Mangroves seed 712, media 1280x720, Intel UHD 0x9A60. Identical ordered opaque/partial shader draws in both arms. Same 24-unit lateral camera trajectory, 60 warmup + 90 measured frames per phase/mode. 720 valid GPU samples; all before/after camera and draw/triangle records match exactly. Renderer resource counts remain 237 geometries/121 textures. No reported GL/page errors or state changes.

Incremental mode only repacks an attribute when its canonical version or the sorted permutation changes. Pure camera translation does not force sorting; orientation changes do. A unit test covers identity/readiness, translation caching, rotation reordering and canonical-data preservation. [Day/night visual controls](../mangrove-far-transition-incremental-20261022/README.md) are RGB exact between modes.

| Pair / phase | Packing mean full -> incremental | Marked upload bytes/frame | CPU render mean | GPU mean |
|---|---|---|---|---|
| 1 day | .209 -> .188 ms | 44040 -> 43665 | 7.038 -> 6.142 ms | 27.187 -> 23.162 ms |
| 2 day | .202 -> .196 ms | 44040 -> 43665 | 6.382 -> 6.231 ms | 22.903 -> 22.584 ms |
| 1 night | .203 -> .194 ms | 44040 -> 43665 | 6.614 -> 5.906 ms | 23.804 -> 23.622 ms |
| 2 night | .227 -> .178 ms | 44040 -> 43665 | 7.176 -> 5.950 ms | 23.594 -> 22.703 ms |

Bytes fall only **0.85%** because camera orientation repeatedly changes ordering in the batches. Packing p95 is generally .30 ms in both modes (.40 ms for first full/day run). The .006–.049 ms mean local difference is small. Whole-frame CPU/GPU differences are much larger than this local saving and must not be presented as causally explained by the cache. In particular the first full/day GPU pass is unusually slower than its repetition. More repeated trials would be required to attribute end-to-end gains.

Decision: keep this as diagnostic code, do not adopt it as a meaningful optimization or expand the architecture around it. The smooth visual candidate remains valuable and is not discarded. Prioritize broader visual validation; compacting just partial transitions could be evaluated later if preparation becomes a measured bottleneck.

These are marked attribute bytes, not measured PCIe/driver traffic. syncChunks is suspended during timing; far adapters remain active. This does not measure streaming or resource leaks. Texture/geometry counts are not VRAM bytes.

Reproduce with WG_REVIEW_BIOMES=manglares:

```sh
node tools/experiments/measure-far-incremental-moving-cost-20261022.mjs
python tools/experiments/audit-far-incremental-moving-cost-20261022.py
node --test tests/qa-incremental-far-transition.test.js
```

Full counters and p95/max in benchmarks.json and summary.json. No production/default changes.
