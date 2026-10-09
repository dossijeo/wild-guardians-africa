# Settled repair evidence for new defense comparisons

`createRepairSettlementEvidence` in `tools/repair-settlement-evidence.mjs`
is an optional read-only observer for newly named campaign protocols. It does
not change the frozen intensive producer, its policies, outcomes or archives.

Create it before the comparison starts, call `observe(state)` after every
simulation interval, and call `report(state)` after the final observation.
Keep the same observer across ordinary save/reload round trips. A different
game identity or a rewind is rejected. An independent saved observer is not
implemented; recreating it establishes a new baseline, not full-run coverage.

Each new `RepairApplied.repair` receipt must match an actual whole-coin ledger
debit, with one completion per payment. The output records the worker, target,
arrival endpoint, HP before/after restoration, and actual payment. The latter
comes from the settled ledger, rather than the fractional proportional price.
Repeated observation does not duplicate a completion. A lost event window or
an unobserved new repair debit makes the result incomplete. Missing metadata,
duplicate payments or inconsistent ledger data fail the audit.

Pre-existing repair payments are explicitly excluded. The observer scans the
bounded event buffer during observation and directly looks up only relevant
debits; it scans the complete ledger only at creation/final reporting. Evidence
is retained outside the game's 200-event buffer. It is not installed in the
production render loop.

`verified` means the observed repair receipts and new ledger settlements
reconcile. It does not independently prove route traversal, wall coverage,
campaign survival, loss risk or activity acceptance. The native center-repair
test combines this observer with collision-safe worker movement to the physical
service point, confirms a 54-coin debit for restoring 560 to600 HP, and retains
the original FIFO and hiring-reserve rules. Other physical tests cover walls,
fractional prices, ruin/collapse reconstruction, cancellation and replay.

Historical snapshots without receipt metadata are not rewritten or assigned
new completion claims. Their previously recorded repair-request counts remain
requests.
