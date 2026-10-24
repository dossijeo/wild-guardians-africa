# Populated Canyon with native camera framing

Exact fixture from gran-canon-populated-frozen-20261022: 12 paid millet, 2 paid workers, 120 seconds ordinary simulation. QA pauses before first game frame. Uses nativeCameraPose with Canyon default theta0/phi1.18/distance34, elevated theta0/phi.65/distance34, reverse theta pi/phi1.18/distance34. Terrain clearance is the ordinary native function; no terrain, building, simulation or navigation edits. Full far background systems enabled; walls occlude much of the background in these views.

Run capture-canyon-populated-native-camera-20261022.mjs after creating/copying the fixture. Audit: WG_POPULATED_SUFFIX=populated-native-camera-20261022 python tools/experiments/audit-biome-populated-frozen-20261022.py gran-canon. Twelve frames pass exact saved elapsed/worker-position checks and no page/GL errors. Continuous grass overflow check is not applicable to Canyon, rather than silently inferred from an absent component.

Normal day/night inspected and day contact sheet reviewed. Buildings, crop beds and workers are now readable alongside water; warm stone strata, floor relief and cast shadows remain. Night keeps blue water and readable crops. Daytime distant water reflections repeat conspicuously; retained as a limitation requiring animated review, not a reason to discard bank integration. Generic-camera predecessor is not a valid normal-scale acceptance view.

Matched frozen-main comparison in main-canyon-populated-20261022 demonstrates the material/shadow/water improvement without changing saved actors or camera. Static counters are not GPU/CPU benchmarks. Active-play/motion, water-time animation and combined modest-profile costs remain unproven; Canyon is not declared complete.
