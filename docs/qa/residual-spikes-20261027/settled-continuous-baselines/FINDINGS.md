# A/A reproducibility gate

New optional harness gate waits for60 frames of unchanged resident chunk keys and empty chunk/far/horizon preparation queues, failing with a snapshot after60s rather than hiding noncompletion. Metrics below exclude preflight and partial boundary frames.

Both original-runtime runs started with exactly the same25 chunk keys, camera, target, medium quality,1280x720 Intel UHD and empty queues; both observed40 distinct chunks over40 seconds. No console/page errors. Simulation start elapsed6.0479 versus4.5148s remains unmatched; both advanced approximately40.15s.

CPU P95 23.905 versus16.430ms; P99 31.725 versus21.155ms; maxima47.925 versus28.195ms. Presentation P95 66.46 versus49.98ms. No code treatment exists: these differences demonstrate baseline variability, not optimization. Correcting residency alone did not establish sufficiently tight repeatability for small CPU gains. Do not use the earlier tiny improvements as production acceptance evidence.

Next measurement work must distinguish initial simulation/actor state, JIT warmup and host variability before accepting small changes. Do not falsely attribute this run to a proven thermal or background-process cause; none was established. Current production runtime remains unchanged. Existing merged improvements retain their own evidence; this experiment does not retroactively prove or disprove them.
