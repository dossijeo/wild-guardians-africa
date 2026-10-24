# Loading planting feedback

A rejected planting gesture that hits the soil now reports that another plant does not fit here. Successful planting clears the feedback. English and Spanish are supported. The message is local: a rejected nearby search does not prove the whole region is full, and no global occupancy scan or frame work is added. The existing planting predicate and fixed camera are unchanged.

Reproduce capture-loading-plant-feedback-20261022.mjs on Vite 5190: seed 712, eight plants after 240 deterministic attempts, real mouse click at 640,480, then four day/night landscape/portrait captures. feedback.json confirms rejected gesture and plant count. No GL/console errors; shadow direction and world handoff pass. Four copy/overlay tests pass. Captures show 7 draws / 20110 triangles because newly added plants are still at early growth, unlike the previous four-plant fixture; this is not a performance comparison.

The artifact preserves the visible parchment instead of leaving it blank while interactive. This change provides useful feedback without pretending to have a complete solver for remaining planting space. Portrait initial leaves and final artistic composition remain pending.
