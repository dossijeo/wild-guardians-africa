# Frozen Q15 no-walls seven-night control

Source `7f9c5e69d859efd3880b0980bbf8bd5d0292c543`: integrated runtime `ae846841` plus the same observational wrapper used by the protected control. All 441 source hashes match the protected pilot. No terrain-query cache, strategy adjustment, crop/economy/attack change or new inactivity instrumentation. The existing runner emits historical inactivity fields; they are preserved without using them as a gate or calibration target.

Exact CLI:

```
node --cpu-prof --cpu-prof-dir=.cache/q15-no-walls-profiles --cpu-prof-name=q15-no-walls-sabana-123-7.cpuprofile tools/run_native_short_observed.mjs --out .cache/q15-no-walls-short-7f9c-good-control-123-7 --days 7 --seed 123 --strategy no-walls --labour-policy q15 --crop-policy cashflow --defense-policy shore --defense-start-day 6 --repair-policy breach-first --defense-funding rolling --biome sabana --culture mapungubwe --profile olderFemale
```

PID 30336/session 31217 naturally returned exit 0; no restart or technical stop. Started 2026-10-12T11:45:13.301Z, terminal 11:45:27.351Z (14.05 s). No other campaign process was present at inventory. No other task was stopped. Source stayed frozen throughout.

Seven nights completed with no defeat and no victory claim; day 8/time 0. Cash 768, 410 physically paid deliveries, 72 crops destroyed (33 on night 6, 39 on night 7), center HP 600 throughout, zero wall/repair payments. Native delivery/raid evidence coverage verified. Final snapshot roundtrips exactly; SHA `7cc0b5c47a36ca9aef83c036140c4e86ded45e9b113ff730b648d782db3307d2`. All daily ledger reconciliations are zero, integer ledger from starting 1500 closes at 768.

`no-walls` is the existing frozen strategy: defenses OFF, repairs ON, Shield ON, moderate agricultural magic, ordinary midday hiring. This is not a no-magic control. The first five days exactly match the protected pilot's money/living/destroyed values. After defenses would start, paid construction and damage make the trajectories naturally different.

| Retained pilot | Completed nights | Final cash | Delivered crates | Paid walls | Paid repairs | Crop losses | Wall duration |
|---|---:|---:|---:|---:|---:|---:|---:|
| Protected Q15 | 7 | 731 | 440 | 780 | 0 | 27 | about 638 s |
| No walls Q15 | 7 | 768 | 410 | 0 | 0 | 72 | 14.05 s |

The no-walls observer recorded 2681 decision-to-observation windows, 11,133.05 ms total, maximum 310.96 ms and zero windows above the 2000 ms technical threshold. Those windows include the tick and surrounding evidence/agricultural work, not preceding policy proof. The protected CPU profile previously attributed 558 s to service-component proofs. Together these observations justify optimizing QA proof work before more protected campaigns; they are not an isolated rendering, GPU or universal tick-performance benchmark.

Original output, stdout/stderr and full CPU profile are compressed byte-exact with raw/compressed hashes. Run `node tools/audit_native_no_walls_short.mjs`; optional third argument is a frozen source directory for checking all 441 sources. Initial audit failed only because sparse checkout omitted the protected archive used as the comparison input; including that tracked documentation directory fixed ENOENT without runtime changes. No campaign rerun occurred. No 100/180-night acceptance or main promotion.
