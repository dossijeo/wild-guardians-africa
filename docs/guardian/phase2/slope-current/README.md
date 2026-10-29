# Hyena lateral recovery on a real slope

Revision tested: 39ef0b6bc, installed production actor. Browser fixture: `tests/browser/guardian-combat.html?slopeTrial=1&recoveryDay=1&recoveryClose=1`, hyena, lateral direction, sound enabled, selected-cycle recording. The fixture selects actual terrain; grade 0.179743 (about 18%), not a synthetic tilted floor. Close camera follows the animal for diagnosis; it is not production camera behavior.

The continuous recording contains 12.102 simulated seconds. Completed cycle, zero errors, zero roll failures, maximum one Guardian, one physical actor at peak and zero active bodies/recovery states at the end. The roll completes in 0.983 seconds. 37 sampled recovery support minima range from 0.010000 to 0.037073 metres. These are sampled recovery vertices, not an all-vertex/per-frame penetration proof.

Inspected the one-frame-per-second contact sheet: visible lateral displacement/fall, supine transition, rise and resumed movement. The full video is retained. Sparse samples cannot approve every intermediate joint/contact or perceptual sound mix. This single-species, single-direction slope run does not close the full terrain/species matrix and is not a paired performance benchmark. No production code was changed for this check.

## Heavy species / elevated impact

Recorded rinoceros from the same real slope, fresh page, installed production model, `rhino` and `high` selections. Video and status: rhino-high.webm/json; contact sheet samples at 2 fps. 12.004 simulated seconds, completed recovery, zero errors/roll failures, maximum one Guardian, peak one physical actor and zero remaining down states/physical simulations. 35 recovery support samples range 0.010000–0.044481 metres. Roll completed in 0.633 seconds without timeout.

Inspected the sampled fall, rest, supine rotation, rise and subsequent motion. Close tracking frames the animal but crops the Guardian during elevated launch; this video must not be used as summon framing acceptance. Impact direction is explicitly overridden by the QA control; it is not evidence of automatic production placement. No full-speed perceptual audio or all-frame anatomical/contact acceptance claimed.
