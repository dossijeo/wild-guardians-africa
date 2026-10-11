# Final-night native solvency boundary

Diagnostic of the remaining QA-134 failure from shared-power-contract-triage. Production sources, military parameters, economy and pilot policies are unchanged.

The previous natural final-night fixture had an intact center, no crops, and capitals 105/1000. It assumed that the current natural raid would destroy the center and make the 105 case insolvent. All five cultures actually finish with the center intact at 525/600 HP, unchanged cash and minimum 35 coins (original 30-coin wage plus original cheapest five-coin seed). Both capitals therefore produce a legitimate native victory. Full original event traces are retained; this is not evidence of responsible campaign survival or military calibration.

The test now exercises 34/35/105/1000 with the same naturally planned physical attack in each culture. It requires StructureHit, surviving operational center, exact 35-coin minimum, RaidEnded before terminal event, no active raid, correct completed-night/day progression, exactly one victory or defeat event, and unchanged cash. Capital 34 loses natively at dawn; 35/105/1000 win. Nothing forces center damage, currency loss or crop destruction.

Existing adjacent physical Rhino last-center tests remain unchanged: actual collapse, reconstruction thresholds 799/800 and final-night dawn solvency 835, across all five cultures, including saved terminal state. They separately cover defeat after genuine structural destruction.

All 23 tests in acceptance-economic-boundaries.test.js pass. Initial negative result is preserved in shared-power-contract-triage/integrated-next-triage.txt.gz. This is focused economic/terminal QA only; remaining global tests and military campaign acceptance still block integration.
