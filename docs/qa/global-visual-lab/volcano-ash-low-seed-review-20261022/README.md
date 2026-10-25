# Volcanic deposits: low profile and second seed

Reproduce: `node tools/experiments/capture-volcano-ash-low-seed-review-20261022.mjs` with Vite port 5190. Seed 913, baja, 1280x720, three camera poses, day 150/night 350, native/deposits. Same QA modifications as the seed-712 media pilot; no production change.

Twelve captures; all six paired camera, target, time, draw-call and triangle checks pass. No captured console or GL errors. All six RGB pairs differ as expected for a surface-material change. Normal-camera day/night images inspected directly: warmer smooth deposits remain legible between dark fractured rock and no new discontinuities are apparent in those static views. Broad ash areas still risk suppressing too much relief, so this is support for retaining the candidate, not proof of final artistic equivalence.

This changes both seed and quality relative to the first study; it tests transfer to another condition, not attribution of cross-study differences. Each within-study A/B remains controlled. No new GPU/CPU timing here; prior Intel UHD media ABAB result cannot establish low-profile cost. Continuous visual camera-motion validation and native integration remain pending.
