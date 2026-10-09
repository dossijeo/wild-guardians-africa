# Root review: strict two-batch candidate

Frozen source: `24b76926d108d39a3d8496ecd9fef063b60454bb`, branch `codex/windows-readiness-observation`, reviewed 2026-10-10. This candidate is not integrated into main.

Root independently read the frozen runtime/workflow/test diff and ran the source/log verifier plus the eight directed suites listed in the candidate's `checks.json`. Result: **86 passed, zero failures/cancellations/skips, 891.1546 ms**. The candidate verifier passed. These are CPU/control-flow checks, not GPU performance acceptance.

The original serial loop and compile function remain identical to the candidate baseline. The opt-in path owns at most two unsettled original readiness jobs, waits for settlement before submitting a third, and attaches rejection handling before a CPU-budget yield. Each submission retains the original objects, full target scene and all selected material variants. Screen state restores synchronously. Failure aborts and drains siblings, retaining the first error; cancellation, context loss, epoch changes and the original per-job deadline remain rejection conditions. Tests cover those boundaries and timer/listener cleanup.

The smoke flag requires both explicit smoke ownership and the compile-window boolean. Workflow default is false. Normal gameplay, assets, renderer/driver settings, CPU budget, per-job deadline, whole-world 90-second readiness gate and downstream depth/texture/draw/fence requirements are unchanged. Observer additions retain scalar window high-water evidence; they do not issue extra GL queries.

Root authorized exactly one Windows workflow dispatch from this frozen source with `compile_window=true` and `resource_overlap=false`. No additional recipe, automatic retry, PR or merge is authorized by this review. Preserve original terminal reports, source/input metadata and complete logs. Compare against the archived `native-f92c6872` diagnostic, with its limitations. Shared pending programs or driver serialization may eliminate any benefit; no saving is presumed.

The agent's original preflight wrapper exit 1 arose after checks from its stdout encoding printer and remains archived beside the final exit-0 preflight. Root does not reinterpret that original process result. Main retains its existing runtime while native evidence is pending.
