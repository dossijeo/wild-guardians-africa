# Packed shadow snapshot experiment

Candidate: abb7fde1e. Baseline sources: parent 73a4bb36c, src/rendering/shadow-cache.js and native-shadow.js, stored without modification in .codex-tmp/shadow-original. Recreate them with git show rather than copying the current candidate. Harness fix: 9be5d5451 restores Vite's resolved Three import in intercepted baseline modules. The failed first sequence remains in shadow-packed-abab.

Both configurations use .codex-tmp/release-lazy-fixed/spatial-threaded.mjs and its shared-memory WASM. No native treatment difference is allowed. Same agricultural fixture, medium 1280x720, active simulation and two camera sweeps per run. A/B/A/B uses fresh browser contexts. CPU sampling and video disabled; GPU queries and existing phase instrumentation enabled.

Commands:
- node tools/experiments/run-shadow-packed-abab.mjs (set WG_SHADOW_ABAB_OUT to a fresh directory)
- node tools/experiments/compare-shadow-packed-abab.mjs <completed directory>

Comparison rejects changing source hashes within either treatment, changing WASM, missing runtime loads, wrong treatment selection, fixture/harness/hardware mismatch, game errors and incomplete runs. The comparison does not automatically accept the optimization.

Correctness: 24 shadow/VFX tests pass, including unchanged-version writes, signed zero, NaN, immutable prior snapshots, independent snapshot equality, interleaved divisors, inactive capacity, animated skin/morph data, unknown depth callbacks, failed draw, context restoration and proxy lifecycle.

The implementation still reads active values every frame to honor the current producer contract. It removes repeated expansion into a generic array and a second element comparison when an unchanged immutable block can be reused. It does not trust upload versions or weaken invalidation. New snapshots are committed only after a successful shadow draw. This is a candidate, not a claimed performance improvement. Real-game ABAB, image review and broader lifecycle validation remain required.
