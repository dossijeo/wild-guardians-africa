> Correction (2026-10-30): the night-31 campaign fixture uses legacy-js navigation/world loading. Its saved state has no wildEngineWorldVersion, and the campaign branch bypasses prepareWildEngineWorld. Earlier descriptions of campaign-derived runs here as native are incorrect. Their measurements and outcome equality remain historical legacy-engine evidence only; they do not validate Wild Engine performance. Non-campaign lightingReview runs explicitly reporting spatial-wasm are unaffected. A compatible native populated-world comparison remains required.

# Moving campaign comparison at bd5f97961

Restored the same night-31 campaign in two fresh page loads, Guardian presentation then reference with presentation disabled. Both retain physical reactions and run native Game.tick/navigation for 400 fixed .05-second simulation steps. Two real-cooldown Attack commands occur at .55 and 12.65 seconds; no fixture health resets. No recording, hidden frames or reported errors. Initial actor records and the complete serialized report outcome compare exactly equal between runs.

| Metric | Guardian | Reference |
| --- | ---: | ---: |
| Average FPS | 10.773 | 10.807 |
| Frame p95 ms | 149.560 | 149.585 |
| Frame p99 ms | 149.900 | 149.800 |
| Simulation p95 ms | 9.285 | 9.020 |
| Render p95 ms | 24.855 | 21.310 |
| Physics p95 ms | 3.905 | 4.260 |
| JS heap start MB (decimal) | 623.633 | 601.019 |
| JS heap end MB (decimal) | 599.679 | 588.350 |

Raw statuses: moving-current-guardian.json and moving-current-reference.json. Heap snapshots include GC variability and cannot establish retained memory or a leak. Fixed simulation steps permit outcome comparison but do not represent real-time simulation pacing on this slow machine. The report's outer clockMode field is generic fixture metadata; navigation trial scope and Game.tick calls describe the actual clock used here.

This one ordered pair supports gameplay-result equivalence for the scenario, not a causal performance conclusion or fluency acceptance. Similar frame tails do not establish zero added cost: render p95 differs, baseline is slow, and there is no reversed-order repeat. Existing engine performance work remains separate. Camera-control responsiveness, broad raid coverage and added-feature performance acceptance remain open.
