# Moving camera: ordered far impostor cost

Intel UHD 0x9A60 / ANGLE D3D11, Mangroves seed 712, media 1280x720, full background. One-world ABAB unsorted alpha / split+ordered alpha. 24-unit lateral camera loop, 60 warmup + 90 measured frames per GPU/cadence pass, day/night. syncChunks suspended during measurements; far adapter preparation remains active. 720 valid GPU queries, no reported errors/state changes.

Ordered preparation marks 44040 bytes/frame for attribute upload and spends mean 0.186–0.199 ms/frame sorting and packing. This counter measures prepared byte ranges, not a hardware bus-transfer measurement. GPU means vary approximately 22.2–24.2 ms across arms; this run does not establish a general FPS improvement.

GPU frame workloads all differ by exactly the expected +4 calls/+2202 triangles. In CPU/cadence pair 2, frames 31/32 contain extra asynchronous native representation differences (+/-1 call and +/-2475 triangles beyond the expected delta); do not attribute those whole-pass CPU differences solely to sorting. Pair 1 has expected workload deltas throughout. Summary retains every mismatch.

Next test compares full packing with an incremental cache under identical shaders/draw counts, skipping uploads when permutation and attribute versions remain unchanged. This is a CPU/data preparation optimization, not reduced graphical quality.

Reproduce with WG_REVIEW_BIOMES=manglares:

```sh
node tools/experiments/measure-far-ordered-moving-cost-20261022.mjs
python tools/experiments/audit-far-ordered-moving-cost-20261022.py
```

Raw benchmarks.json and summary.json contain means/p95/max, camera records, GPU samples and control mismatches. Context screenshots are not synchronized visual parity proof. No production/default change.
