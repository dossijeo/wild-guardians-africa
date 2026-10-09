# Current V4 loading: dense diagnostic and actual Continue

Root executed the feature at `37094d08` on 2026-10-09. These are local desktop observations, not an all-biome or mobile acceptance. Raw evidence is retained in the feature worktree under `docs/qa/interactive-loading-development/v4-root-dense-attribution-37094d08/` and `v4-root-menu-continue-37094d08/`.

## Dense fixture attribution

The Sabana/Mapungubwe dense fixture finished without reported errors; logical state and camera equality passed. Initialization was 19,313.6 ms and total duration 23,708 ms. The 1,148 recorded RAF intervals include six above 100 ms, with a maximum of 282.7 ms. This diagnostic adds instrumentation and is not a clean performance comparator.

The fixture's synchronous deserialization took 215.1 ms. Its four snapshot serializations took 141.3, 145.5, 140.3 and 181.9 ms. These operations are test overhead; production Continue uses the snapshot Worker. Do not attribute every long task to the fixture or subtract asynchronous milestone durations from total initialization time. Production synchronous witnesses still include maize/soil upload at 82.8 ms, loading-screen upload submit at 91.9 ms and loading frame draw at 85.6 ms.

Explicit Dispose reported `disposed=true` and `contextLost=true`; the temporary browser tab was closed.

## Actual menu Continue

Root opened the ordinary application at `http://127.0.0.1:5290/?qa-loading`, selected Continue through the native menu, and continued the first visible day-one Sabana/Mapungubwe slot showing 1.5K coins. No slot was deleted or explicitly saved. This is a small saved game, not the dense save.

The normal HUD appeared after the cinematic. The diagnostic reports Worker decoding at 1.2 ms, completion without cancellation, progress 1, verified readiness, no pending milestones and no download failures. Progress lifetime was 20,009.4 ms, including approximately 4,039.8 ms after visible readiness. All camera eye, quaternion and target values before and after the cinematic are exactly equal. This proves restoration of the intended Home/farm camera for this slot, not persistence of a free-camera pose in the save format.

The 1,093 loading RAF intervals contain six above 50 ms and one above 100 ms; maximum interval was 132.8 ms. Synchronous production witnesses include maize/soil upload at 116.3 ms, upload submit at 55.4 ms and loading frame draw at 51.8 ms. The diagnostic itself adds serialization overhead. No GPU timer or comparison against current main was performed here, so these results do not establish a performance improvement or resolve the loading-time regression gate.

Root retained the DOM report, console log and a real HUD screenshot, then closed the temporary tab. No resource-leak or repeated-load acceptance follows from closing one tab.

The feature reviewer clarified that `progress.elapsed` starts after the prepared diorama promise. It is not click-to-control time and excludes the diorama preload witnessed above. Preserve the raw timestamps when making the fair baseline comparison.

## Actual New and cancellation

Root subsequently tested the same runtime (documentation HEAD `3133870e`) through New Game, choosing Volcanes/Musgum in the embedded selector. The journey finished before the attempted Skip click, so that stale locator failed without changing application state; root inspected the current selector and continued normally. The real world, village, HUD and tutorial were visibly present in the final screenshot. A normal new-game autosave was created; no existing save was deleted.

The diagnostic closed without cancellation, with verified progress 1, no pending stages, no error and no download failures. Progress lifetime was 19,503 ms, including approximately 4,018.6 ms after visible readiness. All camera values before and after the cinematic matched. The 1,071 RAF intervals include two above 100 ms and a maximum of 166.2 ms. This is one desktop New Game, not a comparative benchmark. Raw evidence: `v4-root-menu-new-volcanes-3133870e/` in the feature QA directory.

Root then continued that newly created Musgum/Volcanes slot and clicked Cancel during GPU preparation. Cancellation closed the diagnostic at 64.29% with `ready=false`, `cancelled=true`, `error=null`, and unfinished GPU/far/visible milestones. The actual native menu returned and remained stable after another five seconds. Raw initial and after-wait reports, console and menu screenshot are retained in `v4-root-menu-cancel-3133870e/`. Both temporary tabs were closed; browser inventory was empty afterward. This verifies cancellation during GPU preparation, not every failure/cinematic phase or leak-free repeated loading.

## Integration priority and remaining evidence

The user now prioritizes integrating the loading feature for publication this morning. Visual polish and the paired isolated focus-cost experiment are complete within their documented scopes. Prioritize confirmed upload stalls, a fair current-V4 initialization comparison, progress calibration and current-source functional/lifecycle coverage. Keep the rejected frame-slack experiment disabled. Do not treat historical V3 coverage, this small Continue, or the isolated focus experiment as full production acceptance. Windows is not a merge prerequisite, as explicitly authorized by the user.
