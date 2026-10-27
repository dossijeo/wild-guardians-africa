# Remaining biome sky comparison

Reproduce with Vite on 5190: set WG_REVIEW_BIOMES=manglares,volcanes,desierto and run tools/experiments/capture-global-sky-remaining-20261022.mjs, then python tools/experiments/package-global-sky-remaining-20261022.py.

36 real campaign captures / 18 matched pairs: seed 712, media, 1280x720, three fixed views, day and night, settled streaming and fixed visual time. Camera, target, time, draws and triangles match every pair. No captured console, GL or network errors. The Desert keeps sandMeso=1. Mangrove retains the V11 moss/leaf QA adapters. This is a static art comparison, not a GPU or FPS benchmark.

Inspected all six paired sheets. The reverse views gain a cleaner blue horizon by day and a cooler dark blue instead of the muddy grey-green night sky. Desert dune relief and its approved shadows remain visually intact. Mangrove coverage and volcanic rock detail remain intact. The elevated views contain little or no sky and cannot establish sky quality. Low horizon sky remains too uniform; grading alone has not delivered the intended richer atmospheric composition. No new clouds or sky texture detail are introduced by this variant.

Together with global-sky-paired-20261022, the candidate now has matched day/night evidence across all six biomes. Retain it as an artistic candidate, but do not promote it as a finished global sky solution. Next investigate horizon/cloud composition with sky-visible camera fixtures, followed by native integration and performance validation. No production rendering code changes in this pass.
