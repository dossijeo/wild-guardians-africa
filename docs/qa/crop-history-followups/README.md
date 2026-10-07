# Follow-up candidates after indexing crop growth

QA-only comparison on main `411dc028`. Neither candidate changes production.
The existing living-crop growth index remains active in both arms. Histories,
FIFO tasks, navigation, speeds, economy and delivery rules are preserved.

## Idle anchor coverage

The first short continuation never used the idle-anchor filter, so its timing
was not evidence for that candidate. A longer [coverage probe](idle-probe.json)
then advanced the historical Manglares/Saheliana victory through ordinary paid
postgame hiring: 18 workers, 215 initially living crops and 12,201 saved crop
records. Both arms executed 1,200 warm-up and 100 observed ticks of 0.1 s.

During these 130 simulated seconds each picked and delivered 44 crops, and
their complete final serialized state hashes match. **Neither entered the idle
crop branch**, even during warm-up. Reusing the living index there might help
other situations, but these busy farming runs do not exercise it. Do not infer
that idle-anchor cost was reduced, that idle workers never occur or that the
player has no idle time. No implementation promoted from this probe.

## Pending FIFO target lookup

The second candidate replaces the pending-target history scan in `reserveTasks`
with the existing entity-ID lookup, retaining plants/crates/structures precedence.
Both temporary task modules have identical counters outside gameplay state;
both temporary game modules use current production growth/worker indexes.
The busy-worker and blocked-task branch is unchanged.

Per historical save: four calibration lots, then eight measured lots in
A/B/B/A and B/A/A/B order. Ordinary paid hiring, five cold-route warm-up ticks,
then 300 timed ticks of 0.1 s. Unlike the idle probe, all lots exercise the
candidate branch. All twelve complete final state hashes match per case.

| Case | Saved crops / initially living | Paid workers | Target passes in timed window | Pickups / deliveries including warm-up | Full scan median¹ ms | Candidate median¹ ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Manglares / Saheliana | 12,201 / 215 | 18 | 16 | 24 / 16 | 0.411 | 0.446 |
| Gran Río / Mapungubwe | 13,541 / 557 | 47 | 46 | 43 / 27 | 1.887 | 1.728 |
| Sabana / Mapungubwe | 20,443 / 546 | 46 | 45 | 43 / 19 | 1.333 | 1.357 |

¹ Median of four measured run medians, entire simulation ticks, not isolated
lookup time. Some paired medians and tails improve and others worsen. Gran Río
p95 ranges from 12.87 to 76.94 ms for full scan and 11.02 to 61.65 ms for the
candidate. Concurrent long campaigns and the agent's functional browser work
make tails particularly unsuitable for a broad frametime claim.

**Decision: do not promote the target candidate from these mixed results.**
It preserves these continuations, but does not establish a consistent benefit.
Keep production unchanged and focus the next performance work on the known
render cost rather than adding another cache based only on asymptotic reasoning.
This is not current 100-night replay, GPU/RAF, mobile, RAM or visual acceptance.

[Summary and log bindings](summary.json), complete reports:
[Manglares](mangrove.json.gz), [Gran Río](river.json.gz), [Sabana](savanna.json.gz).
Reports include every timed sample, full-state/input hashes and source hashes.
The two audit tools pass `node --check`; their reference/candidate runs enforce
complete final-state equality. No build or new full suite is warranted by these
standalone QA tools; the runtime remains the one covered by 2,816 passing tests.

Run serially: `node tools/compare_task_target_index.mjs OUTPUT.json SOURCE`.
SOURCE is one of `intensive-mangrove-shield-100`, `intensive-river-rejoin-100`,
`crop-lifecycle-eight-100`. Idle coverage:
`node tools/compare_idle_crop_index.mjs OUTPUT.json intensive-mangrove-shield-100 1200 probe`.
Tools create temporary modules under `.cache`; parallel invocations of the same
tool must not share those paths.
