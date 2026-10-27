# Manglares: candidate not accepted globally

Four interleaved runs completed and invariant comparator passed. Same Intel UHD, historical populated save, 240 advancing frames and 15 new chunks per run, no final pending/failed stream work.

|Metric|A1|B1|A2|B2|
|---|---:|---:|---:|---:|
|CPU maximum ms|327.19|43.15|54.14|62.53|
|Callback P95 ms|99.63|116.20|99.83|116.41|
|Settled seconds|12.439|16.990|19.313|21.012|
|Travel seconds|12.357|16.056|13.555|16.808|

The first baseline reproduced a 185.67 ms program-log driver wait. Neither candidate had GL calls exceeding 10 ms, but the second baseline did not either. Candidates consistently worsened callback cadence and total completion time. The Volcanes improvement does not establish a global benefit. Do not merge this candidate as a universally accepted optimization.

Keep candidate isolated for attribution: identify repeated preparation/readiness work and publication latency before redesign. Two repetitions, active world advances with wall time, query durations include pipeline bubbles, and 28 existing compiler warnings per run. No assertion of GPU busy-time savings or final fluency.
