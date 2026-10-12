# Day-13 reconstruction burst: next performance gate

The frozen seed-123 good/Q15/cashflow/shore native pilot was rerun from the
same branch/runtime (`fed10dca`) and stopped cooperatively at day 13, time 192.
`pilot-v133-day13-time191-attribution/` contains the saved state, source
hashes, receipt and ten native phase samples. This is calibration evidence,
not a defeat or a completed 14-night campaign.

At simulated time 191.0–192.0, `worker-update` took about 750 ms across ten
substeps; `raid-update` took less than 1 ms. The first two worker substeps took
445 and 297 ms. The `day13-v133-worker-replay-t192.json` diagnostic then
replayed the exact checkpoint for ten seconds without virtual-player
decisions. Its first tick is cold and should not be compared directly with an
uninterrupted frame. Subsequent spikes coincide with seven navigation epoch
changes between times 193.8 and 199.7. All seven were physical worker repairs
of ruined walls, so the new wall geometry really must invalidate intersecting
routes.

The most expensive individual native queries were repair routes for workers
already walking to assigned tasks: 309 ms to a repair point near structure
4265, 245 ms near structure 5217, and 190 ms again near structure 4265.
Other large queries targeted crops. This explains why preserving routes
*outside* a rebuilt wall improved the pilot but could not remove every hitch.
Those intersecting paths still need a physically valid replan.

The next candidate should use the existing `Navigation.findPathSteps` generator
to spread **replanning of assigned workers** over deterministic simulation
steps. Preserve repair-point ordering, native collision/terrain/gate checks,
task ownership and save/reload semantics; return a pending state rather than
mistaking an unfinished search for an unreachable task. Benchmark the exact
checkpoint and an uninterrupted pilot before approving the candidate. Do not
alter economic, agricultural or military balance, and do not launch the
100-night campaign until long frames are acceptable.
