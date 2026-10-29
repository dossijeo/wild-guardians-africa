# Mixed live recovery after ribbon reuse (0884ff39d)

Executed guardian-combat.html?recoveryOverview=1&peerSpecies=lion, Medir 4 impactos reales, default hyena and automatic directions. Real Game.tick and WorldScene: one hyena and three lions, four simultaneous QA Attack commands with cooldown resets. This is not a production balance test.

16.083 simulation seconds completed in 16.807 wall seconds, 435 frames, zero hidden frames/errors. Peak three physical actors plus one baked fallback; one request was deliberately rejected by the physical budget and served by that fallback. Final down count, physical active, baked active and visible Guardians are zero; maximum visible Guardians is one; roll failures zero. Inspected screenshots capture a mid-recovery pose and final standing/attacking actors, not every transition or contact.

Frame p95 66.49 ms, p99 66.65 ms, max 116.38 ms. Physics total p95 19.575 ms; solver p95 3.29 ms; recoveryFollow p95 14.55 ms; recovery p95 12.865 ms. These stage counters may overlap and must not be summed. Recovery CPU requires investigation; no performance acceptance. Diagnostic support sampling adds work outside the measured render span and affects frame timing. No comparable baseline or repeated trials were run for these values.

VFX p95 1.225 ms; animation p95 .275 ms. Final renderer counts: 224 geometries / 123 textures; one heap snapshot 489,177,409 bytes, not leak evidence or an incremental-memory estimate. Raw data and exact traces: ribbon-mixed-cycle.json. Screenshots: ribbon-mixed-active.png and ribbon-mixed-finished.png.
