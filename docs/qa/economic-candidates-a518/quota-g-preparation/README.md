# G preparation: four-trip daily running reserve

This isolated diagnostic branch starts at frozen F `83b1c1eaa0235f9a9b34966f88b496f42eeb161b`. It changes exactly one gameplay parameter: `workers.daily_run_distance_long_trips` from 3 to 4 in the canonical configuration, regenerated into balance.js. No pilot has run. No production acceptance, PR, or promotion is implied.

The original three-reference-trip stamina requirement remains recorded in docs/plan/balance_confirmado.json and in the immutable F source/control. G explicitly proposes revising that limit to test physical service capacity. The existing calibration assertion now reads the configuration; the additional G test explicitly requires the original value 3, candidate value 4, and deep equality of all other canonical and generated fields. Original lab route speeds, physical reference length, urgency, animation phases and task ordering remain unchanged.

Quota changes from 105.80409353316266 to 141.07212471088354 metres. If every additional metre replaces walking (1.08 m/s) with running (2.4 m/s), the arithmetic upper bound is 17.9605714331 seconds per worker-day. This is not an observed saving or campaign prediction. Carried harvest boxes continue walking; flight bypasses stamina without refilling it.

Targeted native tests pass 13/13: exact exhaustion and mixed run/walk timestep, zero-reserve flight, carry during urgency/flight, genuine hiring, pause and snapshot restoration, plus original locomotion checks. The first run failed because the new fixture incorrectly expected a successful Game.hire call to return true (its contract returns undefined); the failure log is retained, and the corrected fixture verifies the worker actually exists. No simulation implementation was changed to fix the test.

source-preparation-receipt.json compares tracked runtime/configuration/producer files against frozen F and records all hashes. Only canonical configuration and its generated balance differ. G needs its own eventual commit/source provenance; it cannot claim identical F full-state hashes or prefix once the running quota changes.

F100 remains rejected: 26.433333% idle, including the failed first-ten-day 35.966667% band. These directed fixtures do not test visual presentation, the hundred-night activity gate, bad-management losses, or the thirty biome/culture matrix. Wait for root review before any G pilot. H action-time changes are not included.
