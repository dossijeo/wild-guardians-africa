# Decision: do not adopt regional depth capture

Frozen-source ABAB completed: 240 advancing frames and15 new chunks in every run, no pending/failed work. Comparator invariants passed.

|Metric|A1|B1|A2|B2|
|---|---:|---:|---:|---:|
|CPU P95 ms|23.19|26.08|22.54|26.43|
|CPU maximum ms|57.78|63.88|53.82|60.84|
|Callback P95 ms|66.51|116.46|116.43|116.18|
|Settled seconds|11.176|17.511|19.070|16.402|

No consistent total-frame/throughput benefit; CPU worsens in both pairs. GPU queries include bubbles and substantial run variability, not exclusive GPU work. Candidate2 overlaps a small unit-test process as recorded in EXECUTION-NOTE; no final acceptance claim is based on this sequence. This evidence is insufficient to justify adopting added complexity, so stop this approach. Static depth equivalence and conservative bounds tests alone do not justify production use.

Both scissor and cropped-camera variants remain QA-only. No production imports or default activation. Preserve footstep soft intersections. Next work returns to final-state real-game coverage and measured program readiness; do not repeat this experiment without a new causal hypothesis.
