# Native navigation comparison at 99ef655e5

Restored the same night-31 snapshot for each variant in guardian-combat.html?campaign=1&navigation=reference, then navigation=guardian. Both execute 400 fixed 0.05-second Game.tick steps with native navigation and combat physics. Reference suppresses Guardian presentation only. One eligible Attack was issued at 0.55 simulation seconds in each run; do not describe this as two successful casts or a sustained barrage.

Final outcome objects match exactly (RNG, animals, workers, structures, crops, time, result and pauses). Both runs report no errors. Reference average 10.620 FPS, frame p95 149.73 ms, p99 183.755 ms. Guardian average 10.644 FPS, frame p95 149.68 ms, p99 166.305 ms; Guardian VFX p95 .920 ms.

This single sequential pair does not prove a speedup or full performance acceptance. The severe shared frame times remain; fixed simulation steps verify outcome parity but do not prove real-time control responsiveness. No unrelated baseline-engine changes were made. The reports are navigation-99ef-reference.json and navigation-99ef-guardian.json. These runs exercise the current ribbon/peer-shape optimizations together, but isolate neither change individually.
