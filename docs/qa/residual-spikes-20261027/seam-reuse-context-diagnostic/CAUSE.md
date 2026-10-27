# Lifecycle harness precondition failure

Snapshot changed elapsed124.936405 to126.266810 and corresponding crop growth. Native snapshot, structures and chunk keys equal. Pauses were empty after recovery. Main-phase instrumentation let the game run; snapshot equality test did not establish a pause before its initial snapshot.

Fix test setup to use canonical Game.pause(menu) immediately before initial snapshot. Retain strict equality and both failures. This is not yet a passing candidate lifecycle result.
