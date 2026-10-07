# Rejected crop center lookup candidate

The candidate memoized operational center lookups in one synchronous crop pass. Complete state comparisons matched:120 synthetic checks and180 timing-case checks;60 additional ticks from an actual archived Manglares victory continued with18 paid workers and Navigation.

Synthetic1200-plant/800-wall medians: first7.414→2.377ms;last13.434→1.661ms;growing0.743→0.963ms. These farms intentionally include missing/ruined centers; they do not represent all normal gameplay.

The actual saved farm had215 living plants,18 workers and40 measured ticks after20 warmup. Medians4.605→4.677ms; background campaigns remain active and timings fluctuate. This does not demonstrate improvement, and the synthetic growth case was slower. Candidate is therefore rejected and game.js restored byte-for-byte to main5bddb12. No live optimization, FPS or RAM claim.

Both exact game sources are retained as gzip, with hashes in the result files. Reproduce from repository root with:

node tools/benchmark_crop_center_checks.mjs docs/qa/crop-center-rejected/reference-game.js.gz output.json docs/qa/crop-center-rejected/candidate-game.js.gz

node tools/benchmark_crop_center_farm.mjs docs/qa/crop-center-rejected/reference-game.js.gz docs/qa/crop-center-rejected/candidate-game.js.gz output.json

The farm input is docs/qa/intensive-mangrove-shield-100/state.json.gz. This is a historical campaign continued for a short comparison, not proof of current balance over100nights. Other imports are shared from the checkout; changing dependencies changes reproduction scope.
