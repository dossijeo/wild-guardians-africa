# Orbital/lateral review inside the configured band — not accepted

Source d82a546 (runtime 7b9b828), Sabana/media, native LOD2 atlas, rectangular sprites, near90–120, fog30–300, sky palette and soft backdrop. Earlier orbital/lateral paths30–50m did not exercise this band; QA now uses configured thresholds. Target acacia paraguas ID0:-2:10. Orbital radius105m, duration20s, height14 above terrain. Automatic pause5s gives90° pose, camera[85.58664194084739,22.48969883679717,140.3412427423997].

The identified tree is nativeLOD2/color0.5 and sprite0.5, density1/readiness1, screen center[640,197.24]. It still shows conspicuous screen-door texture in the day image. Day/night captures share exactly this pose. This falsifies acceptance based solely on avoiding the earlier LOD1 mismatch. Transition remains unaccepted.

The orbital route was started in day, paused and switched explicitly to night through the QA selector, then resumed to20s. Its whole-route simulation equality is therefore intentionally false; this is not a pure-day or pure-night invariant run. It records one target readiness drop1→0 at age14.1254s, range105m, physical[]/coveragefalse/preparedfalse. A sprite fallback remains; no hole has been established, but perceptual handoff requires investigation. Broad all-near audit contains many drops, including culled populations; they are retained, not declared all visible.

A separate lateral route started and finished at night, paused5s for capture and resumed. It completed20s with unchanged state, no target transition drops and no GL/render errors. This single route is not six-biome or all-angle acceptance.

Offline source inspection also found a lighting discrepancy: atlas bake used sun[-30,55,25], while the real world's updateShadowCamera uses normalized(-.82,.52,.31)*240. AfricanToon derives uLightDir from position-target. QA6f7c0e0 will isolate that direction with a new acacia atlas; no cause for the entire artifact or readiness drop is claimed yet.
