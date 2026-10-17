# Event-driven maintenance for topological enclosures

## Existing flow and change

The topological defense bot already subscribed to committed game events and
native crop-group protection transitions. It bought complete certified
enclosures, but never requested wall repairs. The campaign runner separately
queried damaged centers on every decision tick. Wild Engine already had
incremental damage indexes in its intent state; `StructureHit` changed their
HP revision without changing the topology revision.

The new flow is:

```text
confirmed StructureHit / StructureRuined / RepairApplied
  -> Wild Engine intent bridge projects the confirmed structure change
  -> one StructureConditionChanged notification per changed structure/batch
  -> bot marks maintenance or enclosure decisions pending
  -> bot queries native damaged-wall/center indexes only at that boundary
  -> bot requests an ordinary paid repair task if it chooses to invest
  -> existing worker intention planner routes the assigned worker
```

The notification contains the structure ID, kind, gate flag, current and
maximum HP, previous HP/status, damage band, and enclosure/plan-group IDs
when the bot built that wall from a certified plan. Those IDs are attribution
metadata, not a claim that the enclosure remains closed. Current physical
protection and potentially exposed crop IDs remain available on demand from
Wild Engine's existing `getUnprotectedCropGroups()` service. A ruin or wall
removal wakes enclosure planning; HP-only damage does not rebuild navigation.
The repair command retains the game's payment, worker-access and automatic
door checks.

The policy prioritizes damaged operational centers, then ruined walls and
other wall pieces below 80% HP. It uses the native damage lists, real repair
quotes, the existing cash reserves and ordinary `Game.requestRepair()`.
Pending repair tasks reserve their estimated cost and prevent duplicate
requests. Unaffordable work waits for a relevant income event; a minor hit
does not invoke native damage or route queries. Center repairs moved from the
runner's continuous scan into the same event-driven policy only when the
topological policy is selected. The expanding policy is unchanged.

## Matched Gran Cañón / 712 campaign

Both arms used V1 military pressure, the `good` player, topological defense,
the same seed, and identical WASM, `game.js` and `raids.js` hashes. The old
runner/defense policy is source `243c4452`; the new runner/defense policy is
`9e08d55f`. Both completed 14 real raids with verified evidence, zero
issues and no coverage loss. Nights 1–2 have identical serialized-state
hashes. Night 3 differs because the new wall attribution metadata is saved;
cash, crops and wall spending remain equal through night 6. Repair decisions
first change the physical trajectory on day 7.

| Measure | Previous policy | Event-driven maintenance |
| --- | ---: | ---: |
| Living crops after night 14 | 34 | 53 |
| Cash after night 14 | 1,013 | 1,031 |
| Crops destroyed by raids, nights 6–14 | 59 | 0 |
| Animals, nights 6–14 | 61 | 61 |
| Wall hits, nights 6–14 | 67 | 137 |
| Wall HP lost, nights 6–14 | 1,206 | 2,466 |
| Wall modules purchased | 21 | 14 |
| Wall purchase cost | 210 | 140 |
| Repair requests / actual repair spend | 0 / 0 | 39 / 236 |
| Native damaged-center / damaged-wall list queries | 0 / 0 | 47 / 47 |
| Native crop-group / enclosure queries | 61 / 61 | 61 / 61 |

The bot spent more on total wall construction plus maintenance (376 versus
210 coins), but the repaired barrier intercepted all crop attacks in this
run. The number of animals is equal; their hits shifted toward walls. The
different repair and construction trajectories prevent treating the terminal
cash difference as a pure effect of repair cost. This is a matched single-seed
campaign, not a general balance recommendation.

The event-driven policy still receives the existing decision callback once
per simulated decision step. Its dirty flags make this a constant-time check
when nothing happened. No native damage-list, crop-group, route or enclosure
query runs solely because a tick elapsed. In the 14-night arm, 183 structure
condition notifications coalesced into 47 damage-index query batches. The
two full runs of the new arm produced identical nightly and terminal state
hashes, including 39 repair requests. Their decision time was 9.73 and 9.83
seconds; `Game.tick` time was 52.95 and 53.64 seconds. Two old-arm repeats
also matched every nightly and terminal hash, with 11.15/10.47 seconds of
decision time and 51.56/51.20 seconds in `Game.tick`. These wall times
include legitimately different game states from the previous policy and are
not an isolated microbenchmark of the bridge.

The complete reports are archived as [previous run](topological-defense-repair-events/topological-repair-baseline-gran-canon712-14.json.gz), [previous repeat](topological-defense-repair-events/topological-repair-baseline-repeat-gran-canon712-14.json.gz), [new run](topological-defense-repair-events/topological-repair-new-gran-canon712-14.json.gz), and [new repeat](topological-defense-repair-events/topological-repair-new-repeat-gran-canon712-14.json.gz). Each archive was checked against its original report byte for byte. The candidate is `tools/experiments/balance-candidates/v1-pressure.json` from the separate balance branch; it is applied only by that branch's QA runner, not by this experimental change. Reproduce each arm with `node tools/experiments/run-balance-candidate.mjs tools/experiments/balance-candidates/v1-pressure.json 14 gran-canon 712 output.json topological` on the recorded source revisions. The `source`, `inputHashes`, `balanceCandidate` and nightly hashes in each report identify the exact inputs and results.

## Validation and limits

Directed tests cover HP thresholds, duplicate event suppression, breach and
repair notifications, center priority, cash waiting, task deduplication,
unchanged topology revisions on HP-only damage, and save/restore without
replayed notifications. The topological corridor test retains its physical
closure and paid-build checks. Campaign evidence uses real incursions,
economic payments and worker repair tasks; no balance or damage constants
changed.

The enclosure ID identifies the constructed wall set. It does not certify
which current crop group is protected after harvest, expansion or a breach;
the native protection query remains authoritative. This experiment does not
yet cover long-run repair behavior across all six biomes or prove a general
survival advantage. It must remain in the experimental branch until those
cases and the full playable validation are checked.
