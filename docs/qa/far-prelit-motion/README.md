# Moving camera transition checks

Native acacia LOD1, elevated 8-degree prelit day/night atlas, daytime, height 10, desktop viewport 1280x720 DPR1. GPU prepared at distance 50 and readiness reached one before running. Existing fog retained (30 to 300). No gameplay integration or new shader operations.

Three deterministic 12-second paths completed, each with 721 observed running frames:

- approach: horizontal distance 60 to 40 and back to 60;
- orbit: full 360-degree orbit at distance 50;
- lateral: +/-25 lateral movement, forward distance 50.

At every sampled running frame, native packed visibility plus calculated impostor visibility remains one within 1e-6. Zero coverage gaps and zero unready frames; all three stay at native LOD1. Browser warning/error logs empty and WebGL errors zero. Endpoint screenshots saved. This does not test a native LOD switch, chunk unloading, GPU preparation failure, all lighting phases or physical mobile. CPU visibility invariants do not prove per-pixel coverage or imperceptible silhouette blending. Static angle evidence still shows mismatch and remains relevant.

Reproduce with tests/browser/far-native-transition.html?atlas-lod=1&atlas-elevation=8. Select distance 50, Prepare GPU, wait for ready=1, choose Recorrido then Probar movimiento. Camera paths are deterministic and their complete orbit, approach reversal and lateral extrema have unit tests. Rendering diagnostics expose completed trajectory and cumulative coverage values.

No FPS or frametime improvement is inferred from these runs; other campaign processes were active concurrently. The next integration decision must consider realistic horizon distances, fog, angular silhouette interpolation and loading readiness.
