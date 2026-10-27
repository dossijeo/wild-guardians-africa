# Matrix reuse exploratory gate

A1/B1/A2/B2 CPU P95:22.22/20.76/22.31/19.66ms; maxima41.16/36.90/48.07/49.25ms. Candidate reused134 and77 updates.15 chunks and240 advancing frames each; invariant checks passed; no slow GL calls. Completion16.178/15.939/15.537/8.288s. Last-run near doubling of presentation cadence and GPU-query shift is disproportionate to the isolated CPU reduction; do not assign it causally to matrix reuse.

Post-run host check: no Chrome process remaining,108 Node processes (many Codex tool servers), balanced power plan, CPU load snapshot11%, approximately21GiB free physical memory. Snapshot is not a during-run contention or thermal measurement and proves no cause. Leave unrelated tool processes intact. A reversed B/A/B/A sequence will test order sensitivity before any acceptance. Full dynamic/art correctness remains incomplete.
