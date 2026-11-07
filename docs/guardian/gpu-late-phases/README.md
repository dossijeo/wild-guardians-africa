# Guardian GPU samples at steady and fade phases

Captured on feature revision 8ec2fe901, before tutorial guidance, at 1600x900 / pixel ratio 1 on Intel UHD, with 20 beasts in a frozen comparable pose. Each run interleaves none/body/effects/all modes in Latin-square order: 40 warmup and 240 measured frames, 60 per mode. All 240 asynchronous GPU queries resolved per run, with no disjoint or overflow samples. These are GPU timings, not end-to-end FPS benchmarks.

| Phase | None GPU median | All GPU median | Difference | None / all draw calls |
|---|---:|---:|---:|---:|
| Steady, age 0.8 s | 30.983 ms | 32.017 ms | +1.034 ms | 83 / 90 |
| Fade, age 1.9 s | 23.286 ms | 24.070 ms | +0.784 ms | 83 / 90 |

Raw mode-level CPU and GPU samples and percentiles are in `steady.json` and `fade.json`. Steady all-mode GPU p95 was 39.954 ms versus 37.016 ms hidden; fade was 28.281 versus 28.278 ms. Baselines differ substantially between runs; do not interpret their absolute difference as an optimization. Other processes were active on this shared machine. No claim is made about full raid responsiveness, AI cost, tutorial rendering or baseline engine fixes being handled separately.
