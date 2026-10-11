# Actual maintenance after the first-night defense comparison

Both retained dawn snapshots were advanced through day 2 using the same native worker/repair probe and unchanged engine sources. Each hires one older female for 30 coins and requests repair of its one damaged structure. No new plants or magic are applied that day.

The request does not debit money immediately. Repeating the same request command ID is rejected and leaves one repair task. At second 25 the repair is still pending in both fixtures (wall HP 60, centre HP 580); serialization/reload preserves that task. The real worker subsequently reaches the structure and the native completion charges a single `repair:task-*` ledger entry, restores full HP and emits one `RepairApplied` event. The wall repair occurs at about second 136.4, after earlier agricultural work.

| Second-day economy | Paid walls | No walls |
|---|---:|---:|
| Native crate income | 88 | 77 |
| Actual wages | 30 | 30 |
| Actual repair debit | 4 | 27 |
| Daily net balance change | +54 | +20 |
| Opening balance | 338 | 678 |
| Closing balance | 392 | 698 |

The wall cost is `ceil(10 × 40 / 100) = 4`. The centre cost is `ceil(800 × 20 / 600) = 27`. Both are actual native arrival-time payments. The lower control income comes from its real plant loss in the preceding night, not a synthetic revenue penalty. The observed 34-coin daily net difference consists of 23 fewer repair coins and 11 additional crate-income coins. It is not a prediction of repeated daily savings or a measured wall-investment payback.

The no-wall starting/ending balances retain the genuine 340-coin wall-removal refund from the previous diagnostic. A larger ending balance therefore does not mean the absence of defenses has a better sustainable yield. Both ledgers reconcile exactly, including hiring, deliveries and one paid repair. The paired auditor validates expected proportional rounding, duplicate rejection, pending-state reload, restored HP and payment/event identity.

The first probe attempt incorrectly asserted a truthy return from `Game.hire`, which returns undefined after a successful native hire. It stopped before writing output; this was a probe assertion error, not a game failure or economic defeat. The corrected probe verifies the hiring day and actual 30-coin debit instead. This failed attempt remains documented.

Artifacts include the two full day reports and gzip states plus `native-canyon-paid-repair-pair-v1.json`. This adds evidence of actual maintenance and immediate economic consequences to the small paid Canyon perimeter. It does not approve later-night destructive capacity, complete campaigns, human inactivity, performance or production integration. The active v105 campaign remains frozen and running independently.
