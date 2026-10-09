# Complete strike-consumer audit, without a new campaign

The frozen 36a0e204 pilot remains incomplete. Its raw terminal state was lost by
the old runner, so no numeric discrepancy can be recovered or retrospectively
approved. The following is a source-grounded correction and bounded fixtures.

There are exactly two production decrement sites: `updateRaid` spends a strike
for a committed target animation and emits AnimalLogicalHit or AnimalLogicalMiss;
`updateWorkerEncounters` spends a strike and emits exactly one WorkerHit or
WorkerIncapacitated. The original audit counted only the first pair. The worker
encounter probability, damage, push, incapacitation and budget decrement are
unchanged. Unused strikes when reservations prevent further targets remain unused.

Additive native metadata records the already allocated values:

- RaidSpawned: raidId and each actor's id/species/hitsAllocated;
- AnimalLogicalHit/Miss: raidId and animalId;
- WorkerHit/Incapacitated: raidId alongside their existing animalId.

The allocation event is emitted at spawn before a possible later substep
encounter. No new random draw, navigation query, command, clock update or budget
recomputation is introduced. The maximum configured group is twelve, so the new
spawn payload stores at most twelve small identity/allocation records. The event
window remains capped at 200. Existing consumers still read the same type and
previous fields; save serialization preserves additional event fields without
changing its format. Old saves/events lacking allocation metadata remain playable,
but this new strict QA auditor cannot invent that missing evidence.

The observer takes initial budgets from the native spawn fact, not from the first
post-tick actor snapshot. It retains all four consumer types. The auditor requires
allocation and remaining budgets for every actor/raid, and requires their exact
difference to equal distinct consumer events per actor. It rejects absent or
duplicate IDs, repeated committed attack IDs, zero/unknown allocations, missing
actors, malformed remaining budgets and inconsistent counters. Global equality
alone is insufficient. Missing event-window coverage causes rejection.

Real native fixtures cover:

- Game.tick crossing the prepared spawn boundary into an immediate physical
  worker encounter; allocation is emitted first;
- real prepared Rhino spawn, WorkerHit, WorkerIncapacitated, save/reload, a paid
  crop's logical hit and a missing target's logical miss;
- omitted events even with edited counters, duplicate events/attacks and malformed
  identity/allocation/remaining data.

Controlled worker/attack poses in the second fixture are unit inputs, not campaign
commands, pathfinding acceptance or a performance measurement. The same-tick test
uses real Game.tick and native cooperative preparation.

`node --test tests/horde-strike-evidence.test.js tests/encounters.test.js tests/raid-entry-native-prepared-clock.test.js`
passed 23/23, exit 0, suite 2771.9407 ms. Existing RNG ordering, split-frame arrival,
pending600 freeze, actual physical exit and encounter regressions pass. The earlier
combined persistence/consumer check passed 11/11, exit 0, 1642.6924 ms, before adding
the explicit same-tick test. Persistence's additional seven tests passed separately
and its function remains unchanged from cb160fc0.

Snapshot bytes legitimately change because events contain additive metadata. No
old/new full snapshot hash equality is claimed. No economy, policy, FIFO,
reservation, damage, running quota, budget, attraction or threshold changed in this
correction. No campaign, neglect retry, CI, GPU, PR, main promotion or 100-night
acceptance has been performed. Root review is required before any new execution.
