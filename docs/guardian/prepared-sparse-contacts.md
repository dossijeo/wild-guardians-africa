# Prepared sparse contacts experiment

An exact sampler prepares bone matrices once per pose while retaining Three.js morph evaluation, bind transforms and double-precision output. It remains an isolated experiment under tools/guardian; production contact resolution is unchanged.

Five species pass three transformed/morphed pose comparisons against Three.js with a 1e-9 world-position tolerance. All 15 sampler, baked contact and authored wall/corner recovery tests passed while the candidate was integrated (115.316 seconds). No stretch or sampled skin penetration was detected by these tests.

The alternating-order Node microbenchmark in sparse-contact-cost.json shows roughly 30-40% lower median sample cost. Reproduce with `node tools/guardian/benchmark-sparse-contacts.mjs`.

The actual native browser trial does not confirm a runtime improvement. See prepared-sparse-native-profile.json: four impacts complete, zero actors remain down, no errors, one Guardian maximum, three physical actors and one baked fallback. Compared with the prior diagnostic, recovery-follow p95 is 10.315 ms versus 8.780 ms, and inclusive solid-contact p95 is 3.740 versus 3.475 ms. Frame p95 moves in the opposite direction (66.850 versus 82.155 ms), illustrating why these unpaired runs cannot establish causation. Different frame schedules and trajectories prevent a causal regression claim too.

Decision: remove the candidate from production imports. Keep the reproducible experiment and results, without claiming an in-game optimization. A controlled browser pose benchmark would be needed before reconsideration. No texture assets changed. Audio was inactive; the runtime test does not certify visual continuity or sound.
