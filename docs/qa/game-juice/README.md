# Game Juice â€” presentation QA, integration pending

Branch: `feature/game-juice-polish`. Baseline: `origin/main` at
`8f3c00218a38d302556247ca07bd6a4fe348d08c`. Its baseline CI is red. The
discrepancies below have now been diagnosed and repaired as QA-only changes;
`baseline-and-juice-final-tests.txt` records 38/38 passing focused tests. Full CI
is still required before PR/integration; no production balance changes.

## Architecture and guarantees

`GameJuiceModel` observes committed ledger settlements through an external
WeakMap. Observers receive primitive IDs and settled whole-coin numerators and
denominators, after the balance and transaction ID have been recorded. Duplicate
and rejected transactions do not notify. Exceptions in a presentation observer
cannot roll back or interrupt a settlement. There are no ledger scans, new saved
fields, additional payments, historical replays, or changes to `game.js` versus
main. This also preserves exact amounts when native event history truncates at
200 events. The abandoned event-metadata approach remains in branch history;
the final implementation removes that approach completely.

Income and expense are separately aggregated for 120 ms and displayed beneath
the existing coin counter. There is at most one active number per sign, four
temporary elements overall and eight pulse animations. Currency uses exact
BigInt values, including the original settlement rounding, without abbreviating
the displayed reward. Events remain bounded and the observer unsubscribes on
return to menu. No additional WebGL pass, geometry, material, texture, audio
playback or render loop is created.

Confirmed placements and magic activations add brief projected DOM rings; the
native VFX/SFX remain intact. Dawn alone queues a night-survived celebration,
never RaidEnded. Tutorial narration and mandatory surfaces take priority. A
celebration conflicting for more than twelve seconds is discarded; notices also
take precedence. Milestones 10/25/50/75/100 get a warm ornament.
The victory surface has higher priority: Dawn with `state.result='victory'` is
discarded rather than displaying an additional night-100 banner. The milestone
decoration includes 100 for presentation fixtures, but normal campaign victory
uses its existing mandatory celebration. No victory rule changes.
Fresh critical warnings pulse once, and collapse uses a nonstacking 130 ms draw-only camera
offset with exact restoration in `finally`. Automated/manual camera travel and
reduced-motion preferences suppress this offset. There is no saved camera
mutation. Buttons, panels and cards use short transform/opacity microanimations.

Manual save confirmation follows actual repository success. Async errors retain
the existing error path, autosaves remain silent, and confirmation neither saves
again nor creates a simulation message. Returning to menu cancels animations,
removes DOM and unregisters settlement observers. Spanish and English copy are
selected from the existing language provider. Windows quit remains unrelated.

## Functional and visual evidence

`focused-final-tests.txt`: fourteen passing tests across game-juice, save-game
and SFX audit. Includes real paid center/seed commands; exact high-frequency
income/expense, 500 settlements versus 200 retained events; duplicate/rejected
settlements; observer failure isolation; no serialized mutation/replay; Dawn
versus RaidEnded; once-per-day critical pulse; cooldown transitions; asynchronous
save success/failure and silent autosave. `lifecycle-checks.json` additionally
records exact draw-camera restoration and removal of all owned DOM.

`tests/browser/game-juice.html` is an explicitly labeled native HUD/presentation
fixture, with real money and placement/cast commands but no world renderer or
audio. Dawn, critical and collapse buttons provide synthetic presentation events,
not claims of a completed raid. Capture-next freezes only QA animations at a
visible intermediate frame; production durations are unchanged. Its language
switch controls juice copy; the HUD artwork labels retain the fixture's Spanish
locale. Screenshots cover desktop 1280Ã—720, mobile portrait 390Ã—844 and mobile
landscape 844Ã—390:

- `economy-desktop.jpg`: exact +45 / âˆ’30, separated signs.
- `dawn-desktop-es.jpg`, `dawn-portrait-en-final.jpg`: celebration and safe areas.
- `build-desktop.jpg`, `plant-landscape.jpg`, `magic-landscape.jpg`: native command
  confirmation, subtle projected ring and existing action icon.
- `critical-landscape.jpg`: urgent card response.
- `save-portrait-en-final.jpg`: English success below the HUD.
- `manual-save-production-es.jpg`: actual production application, IndexedDB
  manual save success through the pause panel. This is not the fixture repository.

`dawn-save-portrait-en.jpg` is retained BEFORE the safe-area correction; its old
top-center save toast overlapped the coin HUD. It is diagnostic, not final QA.
The final portrait save image replaces that layout. Native sky/world rendering
and audio are not benchmarked by the presentation fixture. Physical mobile acceptance is not claimed by these browser screenshots.
Packaged Windows evidence is recorded separately below.

## Performance scope

ABBA runs 180 frames per segment, 720 frames total: A disables the optional
observer/presentation and B enables them. Both perform the identical native
ledger/event workload. Measurements are elapsed JS/DOM work inside each frame,
NOT GPU timer queries, full frame time or proof of improved gameplay FPS. Root
native CPU campaigns run concurrently; earlier development measurements also
overlapped compilation. Final measurements are separated from compilation.

`typical-abba-final.json`: one confirmed delivery/frame, 720 settlements. A
median 0.10 ms / p95 0.10 ms; B median 0.20 ms / p95 1.00 ms. At most one effect.
`stress-abba-final-isolated.json` records the final 100 deliveries/frame stress
case, 72,000 settlements. The resource cap remains four, including during bursts.
A median 0.60 ms / p95 0.80 ms; B median 0.90 ms / p95 2.10 ms, maximum
5.80 ms. Only one grouped number was active under this synthetic stress load.
No GPU savings or hardware-wide frame-time result is inferred from these values.
The presentation-only fixture does not model a concurrent renderer. The
additional native rendered comparison below covers a dense 500-crop farm; it
does not claim physical mobile GPU acceptance or a thousand-crop frame rate.
Complete CI remains the integration gate.

`stress-first-unpaired-diagnostic.json` lacks an identical A workload and is
explicitly rejected as a comparative benchmark. Other development reports are
retained rather than silently replaced. `build-final.txt`: successful build,
11.96 seconds, with preexisting large-chunk warnings. Browser syntax validation
is recorded separately.

## Native rendered gameplay comparison

`tests/browser/game-juice-world.html` uses the actual WorldScene, Navigation,
models, shaders, shadows, worker pickup/transport/delivery and native animal
attacks. Explicit QA initial credit pays for 500 legal crops of eight species,
an 800-coin center and twenty workers. Native botanical functions prepare mature
fixture plants before timing; this preparation is not simulated worker production
or balance evidence. The fixture excludes audio/autosave/tutorial controllers.
It holds the camera fixed, disables draw-only shaking and fixes each simulation
step at 0.1 seconds. ABBA uses fresh scene/navigation owners from the same frozen
snapshot for every lot, with assets/chunks warmed first. Four 400-frame lots per
scenario are run; the first 200 frames per lot warm the active scenario, the last
200 are measured. `world-rendered-abba-final.json` retains raw samples;
`world-rendered-abba-summary.json` pools equal A/B sample counts.

Each daylight lot performs 58 native pickups and 52 paid physical deliveries.
Each night lot spawns five species and performs thirteen physical crop impacts,
destroying six crops. Every paired final serialized state is exactly identical,
and every measured frame's draw-call/triangle counts are exactly identical.
Juice disposal removes its DOM with identical renderer memory/program counts.
Daylight has at most one grouped temporary effect; attacks create no redundant
per-hit effect. `world-deliveries-desktop.jpg` and `world-raid-desktop.jpg` show the
actual rendered farm; fixture clock/day labels are static artwork, not telemetry.

| Scenario / measurement | A off median / p95 | B on median / p95 |
| --- | --- | --- |
| Deliveries: presentation CPU | 0.0 / 0.0 ms | 0.1 / 1.2 ms |
| Deliveries: render submission CPU | 39.2 / 66.1 ms | 40.8 / 76.2 ms |
| Deliveries: RAF interval | 129.3 / 148.7 ms | 131.8 / 149.3 ms |
| Raid: presentation CPU | 0.0 / 0.0 ms | 0.1 / 0.2 ms |
| Raid: render submission CPU | 28.2 / 38.4 ms | 27.1 / 34.0 ms |
| Raid: RAF interval | 100.1 / 183.0 ms | 100.4 / 180.0 ms |

Day calls/triangles median: 584 / 10,084,402 in both conditions. Night:
248 / 9,514,887 in both. No GPU timer-query claim. RAF includes native rendering,
GPU/CPU contention and fixture report serialization, outside the separately timed
presentation/render work. Root CPU campaign and short native QA run concurrently;
these full frame rates do not represent isolated production-device performance.
Render medians/p95 vary both with and without juice, including an off A2 night
median of 30.4 ms versus on B1 26.2 ms. The ~1.9% daylight RAF median difference
and ~0.3% night difference do not establish a GPU regression. Measured presentation
cost is small and bounded, with no added WebGL submissions or resources.
`world-reused-owner-diagnostic.json` preserves the rejected preliminary setup:
reusing scene/navigation owners across cloned states caused different simulation
state, so those results are not acceptance evidence.

## Packaged Windows persistence evidence

[Build Windows desktop run 38125618478](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38125618478)
passed at source commit `6a96c2ec`. `windows-6a96/desktop-smoke.json` and
`windows-6a96/desktop-visibility.json` preserve its published JSON artifacts.
The native smoke clicks the real manual save command, waits for the new primary
IndexedDB record, then requires the visible `Partida guardada` / `Game saved`
class/text. Receipt: `checks.saveBackend=IndexedDB` and
`checks.manualSaveFeedback=confirmed-after-IndexedDB-commit`. The native
minimize/restore check also passes after five minutes. These are actual packaged
WebView2 checks, not a mock repository. Failure/autosave silence remain covered by
automated unit tests. No new save format or native OS behavior is introduced.
GitHub's v7 single-file artifact endpoint returned raw JSON despite its `/zip`
route; files were validated as JSON and saved without changing their contents.

## Baseline CI blocker, not bypassed

`Validate game` runs `npm test` (`node --test tests`) on Ubuntu/Node20 with a
60-minute job limit, without exclusions. Main run
<https://github.com/dossijeo/wild-guardians-africa/actions/runs/38049609847>
failed eleven tests. `main-ci-failure-baseline.txt.gz` retains its failed-job log.
`baseline-main-failures.txt` reproduces nine native failures with money.js
temporarily restored to the exact main blob, then restored to this feature.
game.js is identical to main. The nine are:

| Test | Failure |
| --- | --- |
| acceptance-clock.test.js QA-011 | RaidSpawned elapsed 0.05000000000001137 versus 0.05 |
| crop-lifecycle.test.js:35 | State hash b15f2d35 versus d2d067f5; 28 crates and 423 coins pass |
| expanded-raid-entry-experiment.test.js:9 | Native impact count 0 versus 1 |
| expanded-raid-entry-experiment.test.js:22 | Historical source hash mismatch |
| exterior-raid-entry-experiment.test.js:22 | First native impact StructureHit versus CropHit |
| exterior-raid-entry-experiment.test.js:38 | Historical source hash mismatch |
| native-raid-capacity-audit.test.js:19 | Historical source hash mismatch |
| raid-entry-topology-experiment.test.js:28 | Clipped bounds now return an entry plan versus null |
| raid-entry-topology-experiment.test.js:32 | Historical source hash mismatch |

The two SFX inventory failures in main are resolved here by regenerating source
line anchors/hashes only: the 126 original files, 100 assignments and 26 pending
items remain unchanged. No audio assignment or audible-acceptance claim changes.
The original failed results, snapshots and historical reports remain untouched.
A broad development suite excluded the two long campaign files only
to avoid duplicating root's live campaigns; it is NOT a full acceptance run and
does not substitute for CI. Its original failed receipt is retained. Root has
reviewed the baseline classification; no merge with red checks.

### QA-only reconciliation

- Reused `333ec3cf`: only fractional `raidFacts.elapsed` uses the preexisting
  clock epsilon; every other field remains exact.
- Reused `67cb0079`: retained historical experiments validate against their
  preserved source at commit `6b253ac`; runtime expectations now test the exterior
  spawn correction already present in main.
- Reused only `raid-entry-topology-experiment.test.js` from `d52d2d82`, NOT its
  experimental magic or capacity evidence. Exterior clipped-bound entries are
  checked physically outside the enclosure and preserve the live bounds.
- The current crop golden differs from the preserved d2d067f5 snapshot in exactly
  ONE field: `events[193].raidFacts`. `current-main-crop-golden-diff.json` records
  that difference. Both hashes are retained, the new metadata is asserted
  completely, and removing only that metadata must reproduce the entire original
  snapshot byte for byte. All money, plants, workers, paths, RNG and times match.
- Current native capacity was regenerated separately in
  `docs/qa/native-economic-balance/main-8f3c0021-capacity/`. Every capacity value
  must match the original historical file exactly; only source provenance differs.
  No historical capacity file was overwritten and no magic branch evidence used.

Broad selected receipt: `broad-selected-development.txt.gz` (3921 tests; 3910 pass, 11 fail before SFX regeneration). Full historical logs are gzip-compressed losslessly to keep QA storage small. No tests were suppressed in CI.
