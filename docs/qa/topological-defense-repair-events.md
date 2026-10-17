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
Wild Engine's existing `getUnprotectedCropGroups()` service. Each returned
group now also lists `associatedCenterIds` from its live crop membership, so
the bot can identify work centers potentially affected by an exposed group.
This association does not certify that an animal can physically hit a center;
the native crop-group status is authoritative for the crops. A ruin or wall
removal wakes enclosure planning; HP-only damage does not rebuild navigation.
The event distinguishes a ruined work center from a wall breach; both wake
maintenance, while only the wall is described as opening a defensive gap.
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

## Additional Sabana / 712 check

The same V1 candidate and topological policy completed 14 verified raids in Sabana in each arm, with zero evidence issues. These are [previous](topological-defense-repair-events/topological-repair-baseline-sabana712-14.json.gz) and [new](topological-defense-repair-events/topological-repair-new-sabana712-14.json.gz) full reports; their archives were also verified against the source bytes.

| Measure | Previous policy | Event-driven maintenance |
| --- | ---: | ---: |
| Raid crop losses, nights 6–14 | 126 | 10 |
| Animals, nights 6–14 | 85 | 87 |
| Repair requests / coins spent | 0 / 0 | 61 / 348 |
| Wall purchase cost | 850 | 530 |
| Harvest deliveries / income | 1,410 / 16,583 | 1,457 / 17,150 |
| Cash / living crops at day-15 dawn | 991 / 106 | 1,299 / 69 |
| Bot decision time / `Game.tick` time | 55.49 / 106.70 s | 30.58 / 117.58 s |

The new policy retained more cash and prevented most raid losses, but had fewer living crops at this particular dawn. On day 14 it delivered 169 harvests and planted 67 crops, compared with 96 and 121 respectively in the previous arm; the smaller living stock follows this different harvest/replant cycle rather than raid destruction that night. This can still matter for subsequent pressure and income, so it requires a longer campaign. The two runs generated slightly different animal counts because attraction changed. `Game.tick` itself was slower in the new trajectory; the bot decision time fell enough that their combined measured time was lower. Neither timing is an isolated algorithmic A/B benchmark. The Sabana result therefore supports maintenance effectiveness but does not establish a general crop-count or engine-speed advantage.

## Manglares / 712 check

The same V1 candidate and topological policy completed 14 verified nights in Manglares in both arms, with zero evidence issues. The new arm built a legal 43-module general-cut enclosure and requested 54 ordinary wall repairs. Full reports are [previous](topological-defense-repair-events/topological-repair-baseline-manglares712-14.json.gz) and [new](topological-defense-repair-events/topological-repair-new-manglares712-14.json.gz).

| Measure | Previous policy | Event-driven maintenance |
| --- | ---: | ---: |
| Living crops / cash at day-15 dawn | 110 / 990 | 123 / 915 |
| Raid crop losses, nights 6–14 | 96 | 5 |
| Animals, nights 6–14 | 84 | 86 |
| Wall purchases / repair spending | 920 / 0 | 430 / 288 |
| Total income | 15,625 | 15,285 |
| Bot decision time / `Game.tick` time | 35.44 / 120.89 s | 26.26 / 112.96 s |

The new policy preserved more crops while finishing with 75 fewer coins and slightly lower total income. It spent less on replacing walls, but maintenance still has an economic cost. The arms diverged after repair and are not identical workloads; the lower measured times cannot be attributed solely to the event bridge. This check exercises the mangrove terrain but does not by itself prove that a particular river edge was used as a certified perimeter.

## Sustained Gran Cañón / 712 check

The same frozen V1 setup was extended to 30 nights, running the two arms sequentially on the same host. Both reached day 31 without a terminal result, with all 30 raids verified and zero evidence issues. The previous runner eventually spent 218 coins on center repairs; it still requested no wall repairs. The new policy requested 175 ordinary wall-repair tasks.

| Measure | Previous policy | Event-driven maintenance |
| --- | ---: | ---: |
| Living crops / cash at day-31 dawn | 35 / 295 | 55 / 950 |
| Raid crop losses, nights 6–30 | 326 | 33 |
| Animals, nights 6–30 | 198 | 240 |
| Wall purchases / all repair spending | 250 / 218 | 190 / 1,200 |
| Total income | 14,081 | 18,251 |
| Bot decision time / `Game.tick` time | 26.65 / 95.37 s | 24.40 / 119.98 s |

The new policy still incurred real agricultural losses on nights 19, 21, 22, 24 and 26. Its higher attraction generated more animals, and its larger surviving farm made `Game.tick` slower. These are campaign outcomes with different workloads, not an equivalent-state navigation benchmark. The reports are [previous](topological-defense-repair-events/topological-repair-baseline-gran-canon712-30.json.gz), [new](topological-defense-repair-events/topological-repair-new-gran-canon712-30.json.gz) and [new repeat](topological-defense-repair-events/topological-repair-new-repeat-gran-canon712-30.json.gz). The two new runs had identical hashes at all 30 dawns and at the terminal state, with 175 repair requests in each and no evidence issues. The 30-night result supports sustained technical stability and a stronger outcome for this seed, but cannot establish survival probability across biomes and seeds.

## Validation and limits

Directed tests cover HP thresholds, duplicate event suppression, gate identity,
center damage, wall removal, breach and repair notifications, center priority,
cash waiting, task deduplication,
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
