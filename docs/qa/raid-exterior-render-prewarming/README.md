# Opt-in render-cycle geometry prewarming candidate

Candidate base is frozen `1e11f4178ca360c4abc3b5d8412d1b482df865a8`; this branch does not change frozen819/prototype files in their worktrees. Main `bc67d4d1668e73a75f79d6e4da239006ac1ea7d3` was inspected read-only: its app advances the simulation before rendering, scene sync updates the existing entry worker, and scene load/dispose own that preparer. Its entry/exterior implementation differs from the historical candidate. **This is not a merge of those historical implementations into main.** Review/port the five small scene connections against current main rather than replacing its scene wholesale.

`python tools/audit_raid_exterior_render_prewarming.py` verifies 457 source/input hashes, three raw CPU logs, inspected-main blob hashes and retained physical snapshot parity. Original staged TAP bytes are preserved with `-text`. Commands and source receipt are in `receipt.json`: 30/30 tests pass. No GPU, actual browser/native renderer, campaign, CI, PR or production approval was executed.

## Activation and actual source connections

`WorldScene.load(...,{raidExteriorPrewarming:true})` explicitly enables the experiment; default is boolean **false**. The application supplies no such option, so existing game behavior remains OFF. Values `1` or `"true"` do not enable it. No new user menu or hidden automatic activation exists.

Load creates the frame controller after the existing entry preparer. The actual `renderFrameUpdates` first phase updates camera/raid camera, then calls the controller immediately before chunk synchronization. Each actual render iteration performs at most one cooperative pump (128 steps / soft2ms), after a current-input update. There is no additional RAF, renderer, artificial async wrapper or simulated-time operation. Disposal restores the old navigation hook before disposing the existing preparer and private job.

Tests call the same controller frame method with real native navigation, and inspect the five exact scene connections. They **do not execute WorldScene rendering or claim a real RAF measurement**. Renderer execution and total rendered frame delivery await root's reserved visual/measurement session.

## Ownership, invalidation and transport

The prototype geometry owner/key/snapshot/finite-complete adoption rules remain unchanged. Mutable jobs use isolated navigation; partial results never enter the live cache. A legal paid wall removal cancels the incomplete request; camera/night-group changes retain the same geometry job. Native structure, gate, alive/status, suppression, village, terrain/profile, shield geometry or navigation-version changes invalidate the key; replacing the TerrainField invalidates ownership independently. Result/postgame cancels; scene disposal closes continuation and prevents later adoption. A different owner's navigation hook is never overwritten on disposal.

The application entry preparer retains its single existing Worker. This first opt-in integration deliberately drives geometry by real CPU continuation; it does not create a second Worker or independent loop. Sharing an off-thread geometry broker with the entry worker remains a possible later change, **not implemented or implied here**. The worker preparation path retains its existing camera/group key and rejects stale entry results independently. Static frame prewarming avoids restart from camera motion, but rapidly changing physical geometry can still repeatedly cancel it.

## Deadline and fallback contract

The controller wraps the existing `preparedRaidEntry` hook, returning its exact result unchanged. A read-only cache inspection records up to 32 bounded deadline observations and aggregate counts: prepared entry, native synchronous entry with warm geometry, or native synchronous entry with cold geometry. It never creates graph data just to report readiness.

When preparation is incomplete at the actual spawn call, the existing native synchronous fallback still runs. No pause, raid deferral, plan consumption, suppressed animal, calendar edit or additional RNG draw is introduced. CPU fixtures show warm and deliberately cold spawns reproduce the control's complete serialized state/RNG, and delegates remain identical. The cold fallback is **explicitly unresolved**: preservation of deadline semantics is not a claim of cheap execution. The application advances simulation before rendering; a deadline can therefore arrive before the next pump. This option must remain OFF until that rendered case is measured/reviewed.

## Representative paid/native CPU fixtures

| Fixture | Continuation calls until complete | Largest controller work observed |
| --- | ---: | ---: |
| Paid closed walls with native gate | 26 | 21.04 ms |
| Paid mixed zarzas/empalizada closure | 24 | 23.23 ms |
| Paid native Canyon cliff closure | 33 | 7.19 ms |

Each completes all five canonical radii, adopts once, constructs zero main-thread graphs after adoption, and matches cold-control native spawn/state/RNG. Independent frozen819 graph/gate parity and a real group12 save/reload/physical exit fixture also pass: initial SHA `20566cb86fdeca91548ecf997195eb5938e099182ee93cf9ea81d76035a9f376`, final `7cc578fb4475b3e5148c629f991d66bed7256ce670153d1c5197ccd975d20416`, twelve exits/four hits/43 unused strikes.

The table is descriptive CPU work in a tight fixture driver, not rendering/60FPS/ABBA or an acceptance bound. Indivisible native scatter and key/update work still exceed the soft target. The advanced prototype's 872-pump/1,039ms total and 34ms indivisible call remain relevant retained limits; this phase does not replace them with small-parcel numbers. No economy, centre800/minimum-wage30, damage, horde, FIFO, routes or actor-radius parameters were changed.

Open gates: root visual/native renderer test, actual prewarm lead time, cold-deadline stall, camera traveling/changing geometry, whole-frame/peak-memory cost, browser message ownership and resource cleanup across actual loading/cancellation. Remaining limitations prevent promotion; CPU parities do not close those gates.
