# Program-only preparation: incomplete travel comparison

Runtime `e61f40b8`, Gran Rio/Suajili archived dense farm, media, 180 m / 15 s.
Both arms enable isolated far preparation and await all 34 worker-model promises.
A has no resident warmup; B uses `residentPrograms`. No buffer instrumentation,
trace, quality/distance reduction or gameplay changes. Four CPU campaigns active;
one QA graphics context at a time. This is not hardware-isolated measurement.

| Arm | p95 interval ms | p99 ms | Max interval ms | Intervals >100 ms | Max render CPU ms |
|---|---:|---:|---:|---:|---:|
| A1 | 116.4 | 316.0 | 432.3 | 24 | 430.4 |
| B1 | 116.4 | 149.6 | 199.5 | 25 | 197.3 |
| B2 | 133.0 | 166.3 | 232.8 | 20 | 178.5 |

Only three arms completed: final A2 failed to create a browser webview twice.
Both post-failure inventories were empty; no A2 measurement exists. The three
completed scenes reported disposal and their tabs closed. Do not call this a
completed ABBA or use it to accept production integration.

Both B runs have lower maximum CPU and p99 intervals than A1, but p95 is unchanged
or worse and long intervals persist. This candidate does not solve stable frame
delivery. Complete the reverse control and diagnose remaining first-use depth/
shadow variants and other stalls before drawing a causal conclusion.

Reports preserve all frames, native state/camera/chunks and GPU query results.
Endpoint screenshots establish neither transition continuity nor dynamic-shadow
equivalence. GPU queries bracket world.render only, not asynchronous preparation
outside it. Production continues without either resident warmup experiment.
