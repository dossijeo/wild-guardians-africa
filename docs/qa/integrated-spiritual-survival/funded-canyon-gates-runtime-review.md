# Incremental Canyon contour: gate topology and native runtime

This follow-up tests the actual 31-piece paid V6 geometry, rather than borrowing evidence from the earlier 34-piece, one-gate fixture. It changes no production economics, crop resistance, military parameters or live campaign sources.

## Gate reconstruction

`audit-native-contour-gate-faces.mjs` reconstructs the native boundary graph and optionally repeats all four original paid build commands with the original native five-second advances. Final persisted structures and ledger must match the V6 snapshot exactly. The first replay assertion compared in-memory negative-zero yaw against serialized zero and failed; the corrected comparison explicitly uses the native persisted representation. No numerical tolerances or geometry differences are accepted.

Reports V1 and V2 inspect the final terrain/solid graph only. V3 also reconstructs the omitted invalid-placement edges that native gate planning uses. All reports remain preserved. V3 shows no gates after 8, 16 or 24 pieces. Both gates are created by the last purchase, not by successive closure purchases:

| Conversion face | Area | Live crops | Gates |
|---|---:|---:|---:|
| Omitted-edge face | 44.70264970414189 | 0 | 1 |
| Crop enclosure | 290.98220000000015 | 8 | 1 |

The empty face disappears when the quote-only omitted edges are removed from the reconstruction. Its gate remains an actual paid entity. The final crop enclosure has one gate, and neither conversion face has two. This explains the count without assuming that both gates serve the same enclosure. It is not proof that the empty-face gate is visually desirable or that approximate omitted segments correspond exactly to a continuous physical terrain boundary. No automatic removal, migration or conversion of an existing gate is introduced.

The regression replays native commands and checks the actual persisted geometry/ledger and the distinct conversion faces. Existing edit/mixed-material gate rules remain separate acceptance requirements.

## Native worker, attack and repair sequence

The worker-day probe now accepts an initial time in [0,150), recording it explicitly. It continues from V6 at second 25 without resetting the clock or granting money. Normal simulation advances to second 300, with a passive reload at second 150 and eight paid replacement plants at second 299.

| Observation | Result |
|---|---:|
| Opening cash after construction | 320 |
| Watered original plants / water events | 8 / 16 |
| Physically delivered crates | 8 |
| Delivery income | 88 |
| Paid replacement seeds | 40 |
| Closing cash before night | 368 |
| Live replacement plants | 8 |
| Maximum observed gate-open fraction | 0 |

The worker can service the plot without opening a gate in this river-crossing layout. This does not demonstrate gate traversal; do not claim otherwise.

The native entry driver completes the first night with one introductory animal, two logical structural hits and no crop destruction. Eight plants survive; no magic or synthetic loss adjustment is applied. Introductory safeguards remain active, so this is not a later-horde defense estimate.

Day two uses an actual 30-coin hire and repair request for the wall damaged from 100 to 60 HP. The native proportional quote is ceil(10 * 40/100) = 4. The request does not debit money, repeating its command is rejected, and reloading at second 25 preserves the pending task and 60 HP. A worker later completes the repair, charging exactly one 4-coin payment and restoring the wall. Eight real crate deliveries provide 88 coins; cash reconciles as 368 + 88 - 30 - 4 = 422.

Raw reports and compressed native snapshots are retained as `funded-canyon-small-worker-day-v1`, `funded-canyon-small-night-v1` and `funded-canyon-small-repair-day-v1`. Each includes source and input hashes, native traces/events and exact ledger reconciliation. No long-campaign, human inactivity, GPU/render, universal gate traversal or overall balance acceptance follows from this fixture.

Validation: 41/41 tests pass across boundary gates, gate passages, native gate/worker/crate behavior, the incremental topology replay and actual completion certificate. The first broader run could not import `three` in the new checkout; installing the unchanged lockfile dependencies with `npm ci --ignore-scripts --no-audit --no-fund` resolved that setup failure. No package or lockfile changes were needed. The frozen v105 process remains active in its original checkout and has not been restarted or modified.
