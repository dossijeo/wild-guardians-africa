# Main-game plant blessing and reload — 2026-10-29

Repeated the opt-in Awakening fixture documented in main-game-wall.md, overwriting only its own QA slot. Loaded it via the normal menu. At 1280x720, selected the visible seedling immediately in front of the nearby thorn wall. Production confirmation identified a plant, explained +20% nearby growth/base value and no harvesting. Pressing Bless reduced charge 100 to 0, kept coins 855, and displayed the permanent fertility-source notification. The Guardian appeared with turquoise energy and disappeared; the plant retained a turquoise ground ring.

Reloaded the browser without manually saving, then continued that same 855-coin QA slot through the normal menu. The charge remained 0, balance 855, the permanent plant blessing notification was restored and the turquoise plant effect remained. This exercises the confirmation-triggered browser save (`confirmAwakening` calls `save` on successful `Game.bless`) rather than just serialization in a unit test.

Evidence: [arrival](main-plant-arrival.png), [result before reload](main-plant-result.png), [after reload](main-plant-reloaded.png).

11 tests pass in awakening-ritual.test.js and awakenings.test.js, including committed-before-pulse persistence and duplicate command rejection. They supplement rather than replace this UI check.

## Open artistic issue
The arrival overlaps the nearby thorn wall in screen space at this strategic camera. The small Guardian remains identifiable through turquoise energy, but the pose is insufficiently separated from the wall for artistic acceptance. Investigate the aerial placement/silhouette scoring with this reproducible seed and target before declaring the obstacle matrix complete. This observation does not establish a physical intersection.

Only one plant, daytime and one camera orientation were exercised. No continuous video, exact pulse timing, sound review, power-loss durability, plant yield simulation or full matrix acceptance is claimed.
