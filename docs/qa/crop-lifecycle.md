# Crop lifecycle observations in an intensive farm

Run `node tools/check_crop_lifecycle.mjs 20 olderMale OUTPUT_DIRECTORY` to observe cotton and banana in the existing Sabana/Mapungubwe intensive strategy, with seed 712 and ordinary proportional midday hiring. The command records full source provenance, progress, original report, final snapshot, financial summary and lifecycle observations. It refuses to reuse an existing directory and preserves a failure snapshot and lifecycle recording when the campaign fails.

The observer reads state after each ordinary simulation tick. It records the first observation, task queue/assignment/worker-state changes, completed or pending waterings, entry into and exit from water-induced growth freezes, maturity, physical pickup, destruction and settled crate delivery. Terminal records survive domain reloads and cannot duplicate delivered income. A report is an independent copy.

Each transition carries the previous and current observation clocks. These intervals bracket a change; they are not exact timestamps of intermediate simulation substeps. The first observation may already include a completed action. The recorded strategy never manually removes crops, so dead plants without a crate are destruction losses. Pending watering at destruction is state evidence rather than proof of the cause. Growing plants' water waits and attack-hit counts are retained in their last alive observation.

No gameplay commands or state changes are introduced by the observer. A normal paid one-night native campaign produces byte-identical complete serialized state with and without observation. Every observed delivered crop maps to its real crate and settled ledger income, after pickup. The focused watering/task/reload check passes, and mutating an exported report does not modify the observer. A third check records successive hit counts and verifies that pending watering alone does not mark a plant destroyed. All three tests pass. The one-night CLI run also passes, and repeating its output directory is rejected.

This is a diagnostic for the unresolved large-farm balance and pacing work. It does not change the original strategy, grant funds, speed up growth, reorder FIFO tasks or adjust animal damage. It does not establish mobile presentation, GPU frametime or 100-night acceptance across all combinations.

## Recorded twenty-night diagnosis

The `bbdbe6d` run completed all twenty nights. Its final full state is byte-identical to the older-men state in the original profile comparison. The report, source provenance, lossless compressed trace, analysis and hashes are retained in `crop-lifecycle-20/`; the snapshot manifest references that existing identical state instead of duplicating it. This run predates the later separate `attack-hit` transition extension; its last-alive and terminal observations still retain the actual hit counters.

Of 21 bananas, thirteen were destroyed and eight remained alive; none were picked. Eight of the thirteen losses happened on the planting day's night. Three were lost before their first watering. Early plantings also waited about 140–150 simulated seconds before initial watering, so late planting alone does not explain the losses. Some waits span a night, during which growth remains correctly frozen. Several plants froze at the second watering checkpoint before attack. Last-alive observations retain one attack hit and terminal states retain two, independently of pending watering.

Cotton produced twelve physically delivered crates. Nine plants were destroyed, including `plant-14348`, which had reached growth 405 and satisfied all four waterings before being destroyed on night seventeen. Automatic harvest requests therefore do not guarantee timely physical pickup from a long FIFO queue.

These records identify work backlog and attack exposure but do not establish that changing only prices or animal damage will solve them. The strategy uses shield and repairs but does not build walls. Its losses must not be generalized to every possible responsible defense strategy.

## Ordinary higher-staffing comparison

`node tools/check_crop_lifecycle.mjs 20 olderMale OUTPUT_DIRECTORY 8` compares one worker per eight living plants against the unchanged default of twelve. This is a player hiring and cash-reserve choice, not a gameplay workforce cap or speed adjustment. Both dawn and proportional daytime contracts are paid through normal commands. The original benchmark and its results remain available.

A native one-night test verifies that the default retains its previously recorded complete-state SHA-256 `acc0e8e9699de4bce79b2297ad71db4cf743fe09d68f47e3f2876b5b07ecca9f`. The eight-plant choice pays for more initial staff, conserves the actual ledger and completes ordinary physical deliveries. Invalid staffing ratios are rejected. Four lifecycle tests pass. Longer comparisons still need their own results; the one-night check is not evidence of better profitability or fewer losses over twenty or one hundred nights.
