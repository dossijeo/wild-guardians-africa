# Reused early F service evidence and proposed detailed trace

No new simulation was needed for the observations below. The retained2346F10
compressed raws passed original input SHA checks and gzip/JSON decoding:
2999 states and3000 decisions. All376 source hashes are identical to frozen83b1
and independently verified against Git2346 blobs. Its complete final-state
parity receipt matches F10SHA5fa1a0bebd54299c4abf45f425bc361c46fba12fc5f8c0864145b7528206920f;
all ten native daily rows are identical to the preserved F100 prefix. Original
raws remain byte unchanged. Postprocessing finished exit0 in0.84s; this is no
performance claim. Root independently reproduced all10 phase totals exactly.

The trace covers2989 contiguous daylight seconds, no internal gaps, using
approximate left-endpoint actor-seconds. Hooks sample only non-raid daytime
states and filter workers by contractDay. Actor-seconds multiply elapsed time
by the number of observed people; they are not global elapsed seconds or exact
substep duration. Day-transition first samples can precede next-day hiring.

| Day | Deliveries | Walking actor-s | Acting actor-s | Carrying actor-s | End initial / water / harvest tasks |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 | 21 | 1190 | 569 | 19 | 54 / 3 / 26 |
| 6 | 18 | 9892 | 2435 | 189 | 107 / 225 / 173 |
| 10 | 97 | 17468 | 3027 | 1855 | 383 / 254 / 307 |

Day10's last observed75 people are65 walking:initial and10 acting:initial,
while307 harvest tasks remain. No idle phase appears in these sampled states.
This supports substantial initial-water service pressure, not a conclusion of
physical movement, path-search cost, broken FIFO, fully utilized employment at
every moment or a late100 cause. Walking status could include waiting; the old
raws contain neither positions nor task/worker identities.

Reservations, blocked flags, individual waiting/completion latency and actual
path metres are absent and remain null in service-reuse-analysis.json. No
reservation decomposition is reconstructed from phase counts.

## Prepared observer, not a new run

`tools/service-observation.mjs` is an isolated scalar observer with no simulation,
navigation or RNG imports. It copies taskIDs/targets/kinds/created-order,
worker reservationIDs/blocked flags and real worker positions/statuses/path
remaining, actionRemaining, gateWaiting, running/runRemaining, fallRemaining
and terrainAvoidanceCount when those actual state fields exist. It records
worker displacement separately from walking phase, counts zero displacement
and explicit gate/fall signals, and leaves private actor-motion WeakMap search/
collision/yield state unknown. It never queries navigation or inserts commands.

Task disappearance is censored unless matching target+reserved worker evidence
exists for WaterSatisfied/CropPicked/RepairApplied, or a crate gains a matching
carrier. Crate pickup is distinct from physical paid delivery. Creation order
is never treated as time. Appearance/reservation/removal intervals have callback
cadence uncertainty and a null lower bound when already present at first sample.
No phase/queue interpolation crosses attack, day boundary or300s daylight end.
Straight displacement is a lower bound on travelled path length within a tick.

Nine directed tests pass in125ms: deeply frozen state/unchanged RNG, detached
scalar ownership, real reservation versus zero movement, censored disappearance,
excluded gaps, forbidden RNG/nav/command access, mismatched completion worker,
crate pickup versus delivery, attacks/day boundary/daylight crossing, and order
versus timestamp. Runner syntax passes. These are observer correctness tests,
not new native service or performance measurements.

The proposed extra control is exactly F10, not15 or100:

`node tools/trace_frozen_f_service.mjs FROZEN83_CHECKOUT OUTPUT_DIR`

It verifies immutableHEAD/clean source/all376 hashes before importing the frozen
producer's simulate/audit/snapshot modules, uses only existing onTick/onDecision
hooks and the original policy, then requires every original first10 daily row
and the entire original F10 final-state hash to match. That requirement binds
commands, money, RNG and all persisted state, not merely aggregate outcomes.
It retains early activity failure. Output adds individual task reservation/
removal intervals, displacement/phase comparisons, route fields, censored counts
and queue aggregates unavailable from old raws. No runtime or policy is patched.

Its simulation cost is not measured yet; storage/work scale with the fixed10-day
task/worker observations, not a new100 replay. Existing raws are reused for all
already available aggregates. The runner has not been executed; review and CPU
coordination precede the single needed detailed control. No balance promotion,
expansion-policy approval or claim that these early data prove late100 follows.
