# Rejected reduced-density variant: low-profile cost archive

User rejected `mangroveDistribution=varied` because it removes too much visible leaf density. These measurements do not support adoption; dense original remains selected.

Chrome / Intel UHD, 1280×720, baja, seed 712, full far backgrounds, fixed camera, paused simulation. Original/candidate/original/candidate, day and night. 60 warmup and 90 measured samples per phase/run, separate cadence measurement. Audit passed: 720 valid GPU samples, no query failures or WebGL errors. Resident scene only; excludes tile construction and streaming. GPU timers and CPU cadence measure different runs, not additive frame components.

GPU means (ms), original → rejected candidate:
- Day first: 16.987 → 20.119; second: 15.351 → 16.495.
- Night first: 18.905 → 21.791; second: 21.359 → 21.423.

No consistent performance advantage. CPU render means mixed (summary.json). Do not infer real gameplay FPS. Full raw records and device identity in benchmarks.json.

Reproduce from repository root: `node tools/experiments/measure-mangrove-varied-low-cost-20261022.mjs`, then `python tools/experiments/audit-mangrove-varied-low-cost-20261022.py`. This reproduces the rejected variant deliberately.
