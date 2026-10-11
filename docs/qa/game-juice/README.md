# Game Juice — presentation QA, integration pending

Branch: `feature/game-juice-polish`. Baseline: `origin/main` at
`8f3c00218a38d302556247ca07bd6a4fe348d08c`. No PR or merge yet: the full
baseline validation is red and must be resolved without weakening its tests.

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
take precedence. Milestones 10/25/50/75/100 get a warm ornament. Fresh critical
warnings pulse once, and collapse uses a nonstacking 130 ms draw-only camera
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
locale. Screenshots cover desktop 1280×720, mobile portrait 390×844 and mobile
landscape 844×390:

- `economy-desktop.jpg`: exact +45 / −30, separated signs.
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
and audio are not benchmarked by the presentation fixture. Physical mobile and
packaged Windows acceptance are not claimed by these browser screenshots.

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
The browser fixture does not model the concurrent renderer cost of a thousand
crops or a large live raid. The final integration still needs the complete CI
and broader gameplay regression gate.

`stress-first-unpaired-diagnostic.json` lacks an identical A workload and is
explicitly rejected as a comparative benchmark. Other development reports are
retained rather than silently replaced. `build-final.txt`: successful build,
11.96 seconds, with preexisting large-chunk warnings. Browser syntax validation
is recorded separately.

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
The other nine tests/goldens, simulation behavior and historical reports are
untouched. A broad development suite excluded the two long campaign files only
to avoid duplicating root's live campaigns; it is NOT a full acceptance run and
does not substitute for CI. Its original failed receipt is retained. Root is
investigating the baseline discrepancy independently; no merge with red checks.

Broad selected receipt: `broad-selected-development.txt.gz` (3921 tests; 3910 pass, 11 fail before SFX regeneration). Full historical logs are gzip-compressed losslessly to keep QA storage small. No tests were suppressed in CI.
