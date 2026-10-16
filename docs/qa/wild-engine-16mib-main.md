# Wild Engine: 16 MiB initial memory on main

The current main source (`960a4bbb`) ships a WASM binary with 4 MiB initial
linear memory (SHA-256
`8590ffa3501f422c847ac9bed99ef53ca8084a8306d5a3cefe97cfdb8284240b`).
The build default changes to 16 MiB. `ALLOW_MEMORY_GROWTH=1` remains active,
and `SPATIAL_INITIAL_MEMORY` permits a 4 MiB comparison build. No simulation,
navigation, economy or combat rules change.

The separate experiment in PR #54 compared true 4/16/32/64 MiB builds with
identical route hashes across six biomes. A legal 14-night Manglares/712
campaign produced identical daily game-state hashes at 4 and 16 MiB; elapsed
time was 402.52 versus 405.47 seconds. That experiment supports the absence
of a material regression in its tested workload, **not** a proven sustained
speed improvement or an exact performance claim for this main-branch binary.
The 4 MiB run grew to 18.875 MiB, so 16 MiB is a useful starting capacity,
not a cap for larger farms.

`.github/workflows/wild-engine-16mib-build.yml` compiles this exact main
source using the pinned Emscripten image at both 4 and 16 MiB, checks the
actual initial capacity, runs the 59 spatial prototype tests on each binary,
and runs playable tests with the 16 MiB build. Both jobs passed in
[run 38874091142](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38874091142).
The 4 MiB artifact is byte-identical to the previously checked-in binary,
confirming that this compiler and source reproduce the baseline. The checked-in
16 MiB artifact is from the same workflow and has SHA-256
`704606fa2b1cf2cada9d4742884866dd5a7e7e228683764032d5b5ef6cd84c07`.

With the 16 MiB artifact in the worktree, the local spatial prototype suite
passed 59/59 tests, `npm run test:playable` passed 188/188, `npm run build`
succeeded, and `npm run test:web-package` verified the distribution. No new
full-length campaign was required for this isolated memory-setting change.
