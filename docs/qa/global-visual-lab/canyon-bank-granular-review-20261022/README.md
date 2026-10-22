# Canyon granular shallows: rejected artistic trial

Reproduce: `node tools/experiments/capture-canyon-bank-granular-review-20261022.mjs`, Vite5190. Seed712/media/1280x720, three fixed views day/night, mineral control versus granular. Twelve real captures. Paired camera/target/time/calls/triangles match; no captured errors. Resident and horizon QA patches use the corrected water creation hook.

The trial replaces the smooth bank fade with noise-shaped shelves and adds a second finer noise frequency to color. It introduces no geometry/draw calls but adds shader arithmetic; performance was not measured because the artistic result failed.

Normal-camera day and night inspection: sharp patches resemble painted camouflage or floating sediment islands, without convincing submerged depth. Night makes this worse. The straight land/water intersection remains. Reject this variant from the native renderer for visual reasons, not cost. Keep captures/code as evidence against repeating a color-only approach.

Next direction should couple land and water shading using the same shore coordinates and existing material detail, or improve actual water-depth response, rather than adding further unrelated noise/color patches. Preserve authoritative geometry and simulation. This experiment does not establish that all shader-only shore treatments are impossible; it establishes that this patch-only approach fails the requested style.
