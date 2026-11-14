# Native rhino wall recovery — current branch

Native spatial-wasm WorldScene, installed rhino, authored recovery and actual Attack/Game.tick. Fixture wall durability is raised and its attack held to keep the obstacle present. One issued impact; simulation completes, final down count 0, maximum one visible Guardian, errors empty. Peak recorded wall contact count: 13. Recovery sampled support starts around +4 cm and has a minimum +1 cm; this case does not reproduce deep entry overlap.

Video and 1 fps sheet show impact, lateral fall beside the wall, supine transition and upright return. The view is wide; sampled support is not full-skin clearance and does not exclude minor penetrations between samples. No audio was enabled. This is not a performance acceptance run. The 16-frame sheet covers the first 16 seconds only.

Artifacts: rhino-wall-current.mp4, rhino-wall-current-sheet.jpg, rhino-wall-current.png, rhino-wall-current.json (full trace), rhino-wall-current-status.json (final DOM state).

Two earlier recording attempts failed to acknowledge upload: the first used an old default receiver, the second used localhost while the receiver only permits the 127.0.0.1 origin. Both were discarded. The published third run used http://127.0.0.1:5194/tests/browser/guardian-combat.html?lightingReview&authoredRecovery&recoveryClose&recordPort=5217 and reports successful saving without errors. No receiver security policy was changed.
