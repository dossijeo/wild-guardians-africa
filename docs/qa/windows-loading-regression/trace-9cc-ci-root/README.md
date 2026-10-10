# Native loading phase attribution — original CI failure

Source: `9cc3ba2f7be4824f133fb9666e0ce50c61827897`, isolated diagnostic branch. [Original Windows run](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38022286170), job `114125662565`. Build and preflight completed; initial smoke failed and visibility smoke was skipped. The original 90-second readiness gate is unchanged.

The official report artifact is preserved byte-for-byte inside deterministic gzip, together with run/job/artifact API metadata and the complete job log retrieved through `gh run view --log` (PowerShell UTF-8 output). `receipt.json` records compressed and original hashes. `python docs/qa/windows-loading-regression/trace-9cc-ci-root/verify.py` verifies provenance and the negative result.

At the deadline, world readiness was false after 90,068.7 ms, with displayed progress 89%. The existing WebGL context identifies ANGLE on **Microsoft Basic Render Driver**, a software renderer. This is an identity observation, not a GPU timer or proof that all delays are caused by that renderer.

Measured awaited phases include animal models (15,024.6 ms) and crop bridges (14,982.4 ms). Animal species are already requested with `Promise.all`; this evidence does not support blaming sequential species loading. The diorama's maize/soil upload invocation took 4,809.3 ms of synchronous submission time, which is not a GPU duration.

At termination, hands readiness was pending for 2,499.8 ms and the initial far-region worker for 4,904.4 ms. No labels or pending entries were dropped. World animal GPU warm-up had not yet been reached. Consequently, optimizing only that later warm-up cannot explain or remedy all of this failure.

Nested and overlapping elapsed phases include waits and concurrent presentation. They must not be summed as exclusive CPU/GPU work. The next investigation is asset decoding and model preparation within the two long phases, and independent readiness dependencies. This run does **not** approve the partition candidate, prove visual compatibility, or replace local/native, web, mobile and all-biome QA.
