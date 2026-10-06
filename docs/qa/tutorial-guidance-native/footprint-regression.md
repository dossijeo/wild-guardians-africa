# First-seed search regression

Validate game run 37546921177 on cee494f exposed 18 failing Sahel opening cases after the guide clearance increased from 1.6 to 3.6 metres. Its fixed eight-ring search could not reach clear terrain outside the authored centre footprint (radius approximately 9.604 metres). Other cultures passed that matrix; the failure was a missing suggested seed, before planting.

The search now extends according to `centerGeometry(center, state).radius`, retaining the existing minimum search extent, 3.6-metre clearance, legal-placement check and worker path check. It does not offer an inaccessible fallback or reduce the guide clearance.

Local validation: 106 tests pass, including the unchanged 90-case guided-opening matrix (three seeds, six biomes, five cultures). Each opening checks physical watering beside the crop, every mandatory watering, automatic harvest, one completed crate delivery and payment only for that delivery. The remaining tests cover hand sequence, scaling, pauses and camera focus. Build and web-package verification pass: 641 files, 859 relative links and 20 runtime GLBs. Logs are in `.cache/guided-opening-footprint-{tests,build,package}.txt`.

This verifies the simulation/search regression. It does not establish visual hand legibility in every culture or replace native-device playtesting. Remote CI for the fix must be checked separately.
