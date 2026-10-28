# Attack replaced by Shield: runtime check

2026-10-28, branch codex/guardian-3d-animation, runtime f556d1e6b. Actual WorldScene fixture at tests/browser/guardian-combat.html on Intel UHD, 1600x900. Presentation clock frozen and advanced through visible controls; this is not a moving raid or physics validation.

Sequence: freeze, night, prepare hyena, Attack, advance 0.02 s, Shield, advance 0.12 s twice. An intervening Grow attempt was rejected by the fixture (no eligible crop at night); its error is preserved in the receipts rather than hidden. Only Attack and Shield were accepted.

At Attack age 0.14 s, one Guardian remained, Shield was materializing and the retained energy had one draw. At 0.26 s, contact.json records one Guardian, one retained attack, three retained draws, closed eyes and mouthOpen 0.802 on the hyena. Hurt and impact audio events were scheduled, but audio was disabled: no audible result is claimed. contact.png captures the scene; the QA panel obscures much of the contact region, so it is insufficient to approve the artistic quality of the impact.

At 0.62 s, cleared.json records no retained attack or retained draws, while Shield and the single Guardian continue. Maximum visible Guardian count stayed one. No additional runtime error occurred beyond the rejected Grow attempt. This verifies the presentation lifecycle only; the fixture was not running animal navigation or physical ragdoll.

The focused singleton, retained-energy and lifecycle suite passed 14/14 tests. Remaining evidence needed includes unobscured contact footage and the same interruption sequence during actual simulation, with sound and camera movement.

## Follow-up with simulation enabled

Repeated from a fresh fixture with Game.tick enabled and audio unlocked. Attack at 3019.71366, Shield 0.02 s later, contact inspected at Attack age 0.26 s. simulation-contact.json shows one Guardian, retained contact geometry, one active ragdoll with 14 bodies, no errors, and successful hurt/impact audio dispatch. simulation-contact.png was inspected with the new hide-controls toggle: the impact is visible beside the hyena while the single Guardian materializes at Shield's location. Audio dispatch is evidence of playback scheduling, not a listening assessment of the mix.

Rotated the camera and resumed continuous simulation. At 3048.42505, simulation-finished.json records the hyena attacking again, no magicDown, zero physics worlds/bodies, zero retained effects and no visible Guardian. Maximum visible Guardian count stayed one. No roll timeout or runtime errors were reported. This proves return to behavior and resource cleanup in this case. The complete fall/get-up motion was not captured frame by frame, so animation quality is not newly certified by the end-state check. No performance comparison is inferred from these isolated timing samples.

The fixture now has an accessible, reversible hide-controls button outside the panel. It hides only QA UI; simulation and rendering continue. Both hide and show were checked in the browser, and JavaScript syntax/diff checks passed.

## Continuous hyena cycle recording

hyena-cycle.mp4 records a separate uninterrupted Attack cycle (not the Attack-to-Shield interruption), using the installed hyena and the fixture's lateral recovery view. Source WebM duration 12.668060 s, 4,206,496 bytes; transcoded to H.264/AAC for review. The canvas recording excludes QA controls. hyena-cycle-status.json preserves the complete visible report, including preceding audio trace entries from this same fixture session; only report.recoveryTrace and the last command describe this recorded cycle.

The report completed 12.02991 simulated seconds, 271 sampled frames, zero hidden frames, peak one physical ragdoll, zero final downed animals and no errors. Across 38 recovery support samples, minimum surface separation ranged from 0.0100 to 0.03137 m. These are sampled supporting vertices, not exhaustive collision guarantees.

Inspected the full sequence as half-second frames (hyena-cycle-review.jpg) and quarter-second frames around the roll/get-up transition. The cycle contains airborne impact, ground settling, roll, authored recovery and resumed locomotion. The actor is too small in this framing to approve neck/limb deformation detail or subtle foot sliding. A closer inspection remains required. This recording also does not replace the outstanding interrupted-cycle video or a paired performance benchmark. The status counters do not by themselves certify artistic quality.
