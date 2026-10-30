# Elevated visibility pruning — 2026-10-29

Elevated candidates now sort by a lower bound excluding nonnegative visibility penalties. Once that bound exceeds the best complete score, remaining ray queries cannot change the winner. Original enumeration order resolves exact ties. Occupancy/frame checks remain unchanged.

`node tools/check_guardian_placement_parity.mjs` compares against git revision 89c2bae4c across 64 synthetic cases (four occluder heights, eight camera headings, clear/crowded footprints). All selected positions match exactly; visibility queries fall from 46,420 to 15,800. [Receipt](planning-pruning-parity.json). This establishes parity for those cases, not arbitrary geometry. The script accepts a reference revision argument and needs repository history and installed dependencies.

All 18 placement tests pass. Production build passes (535 modules, 16.06s, existing warnings). Eight-view browser result retains one Guardian then zero in all rows and no errors. Visual sheet preserves the previous composition. [Current UI/timings](planning-pruned-ui.txt), [previous](planning-timings-ui.txt).

Tower warm planning median day 7.675→6.365ms, night 4.95→4.10ms. Day p95 10.605→12.905ms worsened; night p95 7.735→5.62ms improved. These sequential 20-sample runs are insufficient to attribute tail changes or approve global performance. No claim of sustained FPS improvement. Candidate occupancy checks and remaining setup work still cost time; component optimization/paired timing remains open.
