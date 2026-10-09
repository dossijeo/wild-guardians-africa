# Frozen paired pilot: technical failure, no acceptance

The single authorized Gran Canyon/Saheliana seed 712 paired pilot used source
`36a0e204b1cfa5a8f928f9ea2a92e6529a3418fe`, unchanged throughout execution.
Command: `node tools/horde-defense-comparison.mjs .cache/horde-defense-pilot-36a0e204-20`.
Node PID 46240, PowerShell PID 48240, original exec session 76049.
Started 2026-10-09T22:59:58.894Z. The same session returned exit **2** at terminal.
Native terminal status is `incomplete`, duration 2081770.426 ms.

The responsible arm emitted all twenty daily progress rows, but its terminal
auditor threw `Actual spent strike budgets do not reconcile with native hit/miss events`.
The neglect arm was **not executed**. No retries or subsequent campaign were run.
No balance, activity, physical-delivery, defense or repair acceptance follows from
the daily progress rows. Day 20 reports centre HP 470 and 1110 queued tasks;
neither figure proves that any requested repair reached its target or was paid.

The runner then incorrectly replaced the already returned simulation result
with `failure.partialReport ?? {scope:'Failure before native state available'}`.
Consequently the archived report contains only scope/status/error/provenance;
there is no raw terminal state, raid array, event trace or repair settlement
report. The scope string is erroneous for this post-simulation audit failure.
There is no additional checkpoint containing those missing values. The exact
strike discrepancy and actual paid defenses/repairs cannot be recovered from
the retained progress rows and must not be invented.

`native-original/`, stdout, stderr and the prelaunch receipt are byte-for-byte
copies of the original output. `payload-hashes.json` records their SHA-256 values
and sizes, excluding itself. The original report gzip SHA-256 is
`8e1fb58539f77ec6da42eb5d625dec4fa779b46dd212c218faeed63b9d839828`.
The provenance preserves 389 source hashes. Stderr is empty; exit 2 and the native
error are still a technical negative. The original raw bytes are not rewritten.

Next authorized work is limited to evidence-retention repair and controlled
tests. Strike reconciliation remains strict. There is no new campaign, neglect
run, PR, production promotion, GPU benchmark or 100-night/matrix acceptance.
