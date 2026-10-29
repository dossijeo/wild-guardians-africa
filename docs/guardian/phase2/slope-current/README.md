# Hyena lateral recovery on a real slope

Revision tested: 39ef0b6bc, installed production actor. Browser fixture: `tests/browser/guardian-combat.html?slopeTrial=1&recoveryDay=1&recoveryClose=1`, hyena, lateral direction, sound enabled, selected-cycle recording. The fixture selects actual terrain; grade 0.179743 (about 18%), not a synthetic tilted floor. Close camera follows the animal for diagnosis; it is not production camera behavior.

The continuous recording contains 12.102 simulated seconds. Completed cycle, zero errors, zero roll failures, maximum one Guardian, one physical actor at peak and zero active bodies/recovery states at the end. The roll completes in 0.983 seconds. 37 sampled recovery support minima range from 0.010000 to 0.037073 metres. These are sampled recovery vertices, not an all-vertex/per-frame penetration proof.

Inspected the one-frame-per-second contact sheet: visible lateral displacement/fall, supine transition, rise and resumed movement. The full video is retained. Sparse samples cannot approve every intermediate joint/contact or perceptual sound mix. This single-species, single-direction slope run does not close the full terrain/species matrix and is not a paired performance benchmark. No production code was changed for this check.
