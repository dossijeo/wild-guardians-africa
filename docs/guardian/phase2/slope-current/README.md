# Hyena lateral recovery on a real slope

Revision tested: 39ef0b6bc, installed production actor. Browser fixture: `tests/browser/guardian-combat.html?slopeTrial=1&recoveryDay=1&recoveryClose=1`, hyena, lateral direction, sound enabled, selected-cycle recording. The fixture selects actual terrain; grade 0.179743 (about 18%), not a synthetic tilted floor. Close camera follows the animal for diagnosis; it is not production camera behavior.

The continuous recording contains 12.102 simulated seconds. Completed cycle, zero errors, zero roll failures, maximum one Guardian, one physical actor at peak and zero active bodies/recovery states at the end. The roll completes in 0.983 seconds. 37 sampled recovery support minima range from 0.010000 to 0.037073 metres. These are sampled recovery vertices, not an all-vertex/per-frame penetration proof.

Inspected the one-frame-per-second contact sheet: visible lateral displacement/fall, supine transition, rise and resumed movement. The full video is retained. Sparse samples cannot approve every intermediate joint/contact or perceptual sound mix. This single-species, single-direction slope run does not close the full terrain/species matrix and is not a paired performance benchmark. No production code was changed for this check.

## Heavy species / elevated impact

Recorded rinoceros from the same real slope, fresh page, installed production model, `rhino` and `high` selections. Video and status: rhino-high.webm/json; contact sheet samples at 2 fps. 12.004 simulated seconds, completed recovery, zero errors/roll failures, maximum one Guardian, peak one physical actor and zero remaining down states/physical simulations. 35 recovery support samples range 0.010000–0.044481 metres. Roll completed in 0.633 seconds without timeout.

Inspected the sampled fall, rest, supine rotation, rise and subsequent motion. Close tracking frames the animal but crops the Guardian during elevated launch; this video must not be used as summon framing acceptance. Impact direction is explicitly overridden by the QA control; it is not evidence of automatic production placement. No full-speed perceptual audio or all-frame anatomical/contact acceptance claimed.

## Remaining species

Fresh-page runs at b98bcfd2d, same real terrain and close tracking camera. Sound not enabled in these three runs; recordings are silent. Inspected contact sheets at 1 fps. All three complete twelve simulated seconds, report no errors/roll failures, no remaining down states or active physics and at most one Guardian.

| Species/direction | Roll seconds | Recovery minimum gap range (m) | Samples |
| --- | ---: | --- | ---: |
| lion-front | 0.883 | 0.010000–0.048581 | 36 |
| warthog-side | 2.850 | 0.010000–0.048046 | 38 |
| buffalo-auto | 1.367 | 0.010000–0.020005 | 37 |

Lion and buffalo samples show fall, supine transition, rise and resumed movement. Warthog takes 2.85 seconds to roll; the sampled trajectory appears less fluid and needs a denser review before artistic acceptance. Successful final state does not resolve that visual concern. Near camera can crop Guardian/energy during forced-direction casts; these remain animal recovery diagnostics, not complete summon framing acceptance.
All five species now have one slope recording, but this is not the complete cross-product of directions, terrain, obstacles or consecutive hits. Sampled skin minima are not all-frame contact proofs.

## Warthog repeat exposes a real timeout

Denser 4 fps review of the original roll is in warthog-roll-detail.jpg. Repeated the same slope/lateral setup with captureRoll enabled: the resulting roll times out at 3.516667 s, angular error 1.862030 radians. warthog-repeat-failed.json supersedes any inference of stable repeated recovery from the first successful run. The whole-world snapshot in warthog-roll-capture.json.gz reproduces the failure exactly through replay-captured-roll.mjs (warthog-roll-replay.json). Capture overhead excludes this run from performance claims.

Diagnostic-only support torque multipliers 2.5 and 3.6 (existing 1.8) finish the same captured roll in 2.683333 and 2.066667 s, preserving completion thresholds. Results: warthog-support-2.5.json and warthog-support-3.6.json. These experiments do not change production parameters. Before adopting a correction, check other captured species/contact cases and repeat browser visuals; extra torque can alter contact motion and overshoot. This is an unresolved production recovery failure, not an accepted limitation or completed feature.

## Production correction and repeat

Raised bounded mass/radius-scaled support torque from 1.8 to 2.5, retaining angular speed/acceleration limits, settling thresholds, timeout and bounded progress grace. The new captured-slope regression fails before this change; all 43 ragdoll, combat-manager and captured-terrain tests pass afterward, including all five installed rigs and the unstable-terrain negative control. Production build passes (10.27 s, existing warnings). Replay experiment variants now override the current parameter by name rather than assuming its previous value.

Fresh browser lateral warthog run completes recovery without errors/roll failures and releases physics: warthog-fixed.webm/json. Inspected 2 fps sheet shows tipping onto the back and subsequent rise. This new initial pose takes 3.633333 seconds to roll, using the existing progress grace; do not claim every live roll is faster than the first successful baseline. The deterministic failing captured pose is fixed, but broader repeat stability and full-speed artistic acceptance remain open. Audio was disabled in this repeat.

## Concurrent follow-up after support correction

At dcfe1136f, recorded one warthog and three rhinos on the standard farm (NOT the slope site), recoveryDay/recoveryOverview/peerSpecies=rhino/peerContacts/peerFalls. All four complete within the 16.036-second diagnostic, peak three physical plus one baked, no errors/roll failures/down states at end, max one Guardian. 157 sampled physical peer pairs include 0 negative contact distances. This does not establish separation between samples or baked-mesh contact correctness.

Inspected mixed-fixed-contact.jpg (1 fps) and retained mixed-fixed.webm/json. A building partly obscures one rhino, so its precise support is not visually approved. This is a focused concurrency regression after the torque change, not a full obstacle/performance benchmark. Silent recording.

## Integrated fallback configuration

The expanded integration run first found stale fallback roll metadata (210/211). Regenerating flat-ground clips at live torque 2.5 then exposed a rhino wall-displacement regression (5.184 cm per 120 Hz sample versus the unchanged 5 cm bound); 2.4 also failed. Compressed failing TAP receipts are retained.

The final baker explicitly requests its prior contact-tested flat-ground support torque 1.8 through a validated rollTo option; live uneven-terrain rolls keep default 2.5. The 40 clips were genuinely regenerated, not relabeled. falls.bin is byte-identical to the committed prior payload; falls.json now includes current progress-grace metadata and explicit baked support. No wall/contact threshold was loosened.

All 211 tests in 35 selected files pass after this integration ([integration-checks-e035.json](../integration-checks-e035.json); source revision plus working changes recorded). Fresh mixed-rebaked recording uses the regenerated resource: three physical and one baked actor finish, zero errors/roll failures/down states. Inspected 1 fps samples; building occlusion still limits one animal's detailed contact review. Silent recording, no new performance or broad visual acceptance. Main remote was fetched and zero commits behind at this checkpoint.


## Native Wild Engine repeat, 2026-10-30

At beb5e29d1, ran the installed warthog with lateral impact and lightingReview=1&slopeTrial=1&recoveryDay=1&recoveryClose=1. The receipt explicitly reports spatial-wasm. Actual terrain grade is 0.1775803. The complete cycle finishes with no reported errors and no downed actors; the roll takes 1.416667 seconds, error 0.218634 rad, and does not time out. This is a new initial pose, not a paired speed comparison with the old timeout.

Saved warthog-native-repeat.mp4 (continuous canvas capture), warthog-native-repeat.json (browser DOM receipt), and warthog-native-repeat.jpg (2 fps contact sheet). Inspected sheet: lateral fall beside a tree remnant, turn onto the back, rise and resumed locomotion. Vegetation obscures portions of ground contact; the close camera crops the Guardian during launch. Neither precise mesh/obstacle clearance nor summon framing is certified by these views. Sound was enabled, but no perceptual listening approval is claimed. This repeat adds native-engine evidence for the previously problematic slope roll; it does not close the complete terrain/direction/concurrency matrix.


## Ground-cover diagnostic control

Added reversible Hierba visible/oculta (QA) to the combat fixture, not the game UI. It hides only the groundDetails group/mesh, leaving terrain, trees, other props and collision/navigation data intact. groundCoverHidden is included in the visible status receipt. Browser-tested hiding and restoring. node --check passes.

Recorded warthog-contact-review.mp4/json with continuous grass hidden on the same native slope. The cycle completes with no errors, roll 1.35 seconds without timeout. Inspected the 2 fps sheet: ground is more legible, the body settles beside the tree remnant, rolls and stands, then moves away. Small plants belonging to the tree asset remain and still obscure some contacts; this view does not prove every vertex is above ground. The two black final sheet cells are unused tile slots, not black frames in the video. No audio was enabled for this diagnostic. Hiding ground cover changes render cost; do not compare these timings to normal gameplay. This tool makes future contact reviews reproducible without weakening physical scenery.
