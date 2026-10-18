# Desert night 79: pending animal attack route

An isolated V1-pressure Desierto/712 campaign requested 100 nights on source
`ce64f5c5`. It completed 78 raids, then the campaign runner stopped on night
79 with `Unfinished real incursion`. This is a technical censor, not a balance
defeat or a 100-night result. The frozen partial state had one active warthog
with two unspent hits, a live crop lease, and `path: null`; the other 12
animals had already left.

The native reroute to that warthog's reserved crop interaction point returned
zero: its physical route was blocked for the warthog profile. A worker-profile
route to the same point exists, which is irrelevant to the animal. The
animal-intent bridge previously mapped both a blocked route (zero) and an
incomplete route (negative) to `unknown`. The raid controller then retained
the lease and skipped movement each tick. No relevant topological event was
required to occur before the runner's 2,400-second incursion limit.

The fix reads Wild Engine's route reason immediately after the native reroute.
A blocked **interaction point** now releases its lease so native target
selection can consider another side, crop, or barrier. It does not certify the
whole crop or region as blocked. In the reduced frozen fixture, the warthog
reselects an intact structure on the next update without spending a hit.
Truly unknown routes retain the lease and get slow, exponentially spaced
retries; after 90 seconds without resolution, the animal retreats with an
explicit `unknown-attack-route-timeout` reason. Ordinary valid movement still
performs no replanning. A save with a missing path also publishes a successful
native replacement route to the JavaScript movement copy.

The regression fixture
[`desierto712-d79-pending-attack.json.gz`](../../../tests/fixtures/desierto712-d79-pending-attack.json.gz)
retains the confirmed terrain, structures, live crops and one affected animal.
It omits historical crops, previous events, other finished animals and the
experimental pressure bookkeeping; it is an intent/geometry test, not a
complete campaign save.

Validation on the unchanged production balance and WASM binary:

- Native intent/raid tests: 36 passed, 0 failed.
- Playable tests: 210 passed, 0 failed.
- `npm run verify:balance`: passed.
- `npm run build`: passed.

The original 100-night candidate run remains censored at night 79. A new
continuous campaign with this fix and the same candidate is needed to report
its eventual game result. No economy, raid pressure, hit budget, damage or
movement collision rule changed in this patch.
