# Geometric watering preflight — isolated candidate

Source baseline: main `371e2155`, runtime unchanged from `53a4a996`.
No production routing or test expectations were changed in this experiment.

The bounded post-A* candidate checks up to four alternate watering sides and
stops at a 20% improvement. It preserves the two physical Canyon shortcuts but
does not establish a CPU benefit: whole-day Canyon A1/A2 2586/3338 ms versus
B1/B2 3688/3420 ms. Paid deliveries change from17 to20; workloads differ.
Equal-query ABBA on the two saved counterexamples also fails to show a useful
consistent gain (second query around29 ms original versus31 ms candidate).

The next candidate probes five watering sides for either a clear direct segment
or a validated one-corner building route **before** falling back to native A*.
It never accepts a fabricated last edge, teleports a worker, relaxes body/slope/
fluid constraints, or waters a crop from an inaccessible elevation. IDs retain
the authored side indices. At most48 corner candidates per side are tested;
ordinary open-ground direct routes avoid A*. This is event-time routing, not
per-frame geometry. No new route cache was introduced.

| Real saved query | Original A1/A2 mean CPU | Preflight B1/B2 mean CPU | Original / candidate route length |
| --- | ---: | ---: | ---: |
| worker-14 → plant-38 | 21.77 /15.13 ms | 2.84 /2.80 ms | 33.27 /12.72 m |
| worker-14 → plant-24 | 29.82 /31.66 ms | 5.92 /6.18 ms | 32.93 /14.89 m |

One-process ABBA,12 samples per arm, fresh native Navigation prepared outside
the timed section. Every returned edge is then independently checked with the
native swept-body segment test, approach height/reach is checked, and the save
must remain byte-identical. Original newly queried paths can differ slightly
from the already recorded worker paths; those distinct measurements are retained.
These are domain CPU timings, not renderer FPS or GPU measurements.

Whole simulated first-day ABBA:

| Opening | Original A1/A2 CPU | Preflight B1/B2 CPU | Paid deliveries A/B | End cash A/B |
| --- | ---: | ---: | ---: | ---: |
| Canyon/Sahelian, six older women | 2663 /2850 ms | 3288 /3106 ms | 17 /21 | 337 /381 |
| Default Savanna, older men + midday hiring | 995 /995 ms | 834 /705 ms | 27 /28 | 409 /423 |

All four full states per experiment are retained with hashes. Both repeated
arms are deterministic and pass the native economy audit. More physical
deliveries change reinvestment and task work; whole-day wall time alone cannot
isolate route CPU cost or establish a universal performance gain.

46 directed worker/watering tests pass on the isolated candidate graph, including
the two real counterexamples, all worker profiles, save/reload, height rejection,
native inaccessible Canyon plateau, fluid/slope rejection, task chains and
physical delivery. The wider crop lifecycle suite passes3/4: its complete-state
historical golden fails, expected `ce36573d…`, actual `d2d067f5…`. Unlike the
earlier event-order-only prototype, this candidate really delivers an additional
crate. The complete-state difference includes crops/tasks/crates/ledger/events/
messages/IDs. Do not relabel it metadata-only or silently replace the golden.

Integration remains pending: preserve this intentional behavior change in
meaningful regression assertions, adapt the QA observer without altering native
calls, run the full suite and inspect gameplay. No broad campaign, visual/mobile,
or all-biome performance acceptance follows from these two queries and openings.

`receipt.json` identifies the post-experiment HEAD, Node and source hashes. Each
payload is losslessly gzip archived with its original byte length and SHA256.
Restore payloads to their recorded `.cache` paths at this baseline to reproduce
the isolated graph; the two snapshots live in the earlier watering-detour archive.
Retained wildcard/import-path harness failures were corrected without changing
the production source or erasing their logs.
