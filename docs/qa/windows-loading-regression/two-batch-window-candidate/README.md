# Two-batch compiler window: CPU freeze

This smoke-only candidate bounds outstanding original readiness jobs to two. It is OFF by default; production keeps the original serial loop. See [proposal.md](proposal.md) for ownership, backpressure and historical negative comparisons.

Final preflight session 20373 completed with exit 0: 86/86 directed tests, SFX audit check, five changed JavaScript syntax checks, build (9.51 s), and package check (711 files, 445,275,241 bytes, 860 relative links, 22 runtime GLBs). These are CPU/source checks, not GPU or native readiness evidence. Rust compilation remains for a separately authorized Windows run.

`checks.json` records exact commands, exits and log hashes. `source-receipt.json` records source hashes and byte-identical original compiler/serial-loop and unchanged supporting sources. Run `python docs/qa/windows-loading-regression/two-batch-window-candidate/verify.py` from the repository to verify the receipt.

The initial wrapper session 13116 exited 1 because its cp1252 stdout printer could not print a Vite checkmark after its subprocess checks passed. Its original logs and receipt remain. A later scalar-telemetry change justified the final preflight rerun; it completed successfully. No native run, workflow dispatch, GPU measurement, PR or promotion has occurred for this candidate.

The original 90 s gate, per-job 30 s deadline, batch size 8, CPU budget 16 ms, all material variants and downstream depth/draw/fences remain. Observer `windowHighWater` is a logical job count, not RAM/VRAM usage. Shared pending ground variants and serialized driver work may limit any benefit. No performance improvement is inferred from these tests.
