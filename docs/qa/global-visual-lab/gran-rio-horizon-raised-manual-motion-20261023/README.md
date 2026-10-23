# Gran Rio raised horizon: controlled active excursion

Sourcefbd1f2a6c,QA mountain base-10,medium,seed712,1280x720,populated live scene,full backgrounds.40s144mX/50.4mZ out-and-return excursion; existing RaidCameraDirector.beginManual holds camera without pausing simulation. Day/night run sequentially.

- day: 1110 frames observed,38.064s simulation advance,40 chunk sets,origins[[0, 0], [144, 0]],340 pending-background frames. [Video](day.webm), [checkpoints](day-contact.jpg).
- night: 1014 frames observed,56.212s simulation advance,38 chunk sets,origins[[144, 0]],327 pending-background frames. [Video](night.webm), [checkpoints](night-contact.jpg).

All camera horizontal coordinates match route within5.69e-14units; zero diverted frames. No GL/browser errors,unexpected pause or coverage overflow; workers advance. Videos decode at1280x720 and exceed38s. Not FPS measurements; resources are not a leak proof.

Both nine-image contact sheets inspected: crest remains visible through vegetation; trees correctly cover distant mountains; no obvious floating rectangular foot at sampled positions, including return. Full frame-by-frame temporal inspection is not claimed. Pending far preparation occurred.

Retain the25unit base lift as native opt-in candidate for the reviewed two biomes. Cost evidence is in ../gran-rio-horizon-raised-cost-20261023. Other four biomes need separate artistic treatment; do not generalize this height.

Reproduce: WG_FIXTURE_BIOME=gran-rio; WG_REVIEW_OUT points here; node tools/experiments/capture-horizon-raised-motion-20261023.mjs, then python tools/experiments/audit-horizon-raised-motion-20261023.py <output>. Vite5190.
