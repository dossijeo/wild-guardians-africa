# Mangrove smooth far transitions in motion

Actual campaign seed 712, media 1280x720, native blue water, moss, distant impostors and mountain background. Same 240-frame lateral camera path used for Sabana; day/night, warmup/dither/alpha/return. No production changes.

The smooth candidate removes dotted coverage in distant trees, but must not be adopted yet: the separate [order diagnostic](../mangrove-far-transition-order-20261022/README.md) confirms substantial sensitivity to unsorted instance order.

Motion control is imperfect and intentionally fails the strict audit:

- All 240 daytime before/alpha workloads match.
- Night frame 132 differs by eight triangles (334454 vs 334446), with 54 calls in both and one fewer resident geometry in alpha. Both report asynchronous background preparation pending. The log alone cannot attribute the difference to a specific resource.
- Before/return workloads match across both phases. Seven of ten return checkpoints are RGB exact; the others differ by 5/9 daytime pixels and 4 nighttime pixels. The cause has not been isolated.
- No reported page/WebGL errors. Do not infer FPS or shader cost from recorded wall times.

[Day comparison](day-after-contact.jpg), [night comparison](night-after-contact.jpg). Each variant directory contains motion.webm and five real PNG checkpoints. Live streaming enabled, simulation and grass/material clock fixed. Video recording is qualitative and can omit frames.

Reproduce with WG_REVIEW_BIOMES=manglares and WG_REVIEW_OUT set to this directory:

```sh
node tools/experiments/capture-far-transition-motion-20261022.mjs
python tools/experiments/audit-far-transition-motion-20261022.py
```

The audit writes evidence before asserting; its nonzero exit is expected for this capture, not a passed parity claim. All raw controls retained. Rectangular ground-leaf patterns remain deferred per user instruction.
