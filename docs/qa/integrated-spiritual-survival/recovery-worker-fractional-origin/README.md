# Archived worker departure: current-runtime negative

An isolated native `walkTo` replay used the historical candidate-4 seed-712 terminal snapshot and worker `worker-52429` (contractDay 57, still fleeing at dawn 65). The original snapshot remains untouched. `current-negative.json` records its hash, selected current source hashes, initial/final worker, destination and movement trace.

The current corrected runtime also fails to move this worker during 600 steps of 0.1 seconds. Maximum displacement is zero. The copy's domain result, day, time, elapsed, ledger, plants, RNG and tasks remain unchanged. Gate leaves advance through a shallow presentation-only view; no campaign ticks or economic/player commands run. This is a locomotion diagnosis, not a resurrected campaign or alternative outcome.

Native navigation reports both the origin `(101.37, 14.66)` and village destination `(60, 0)` walkable and terrain-valid. There are no initial overlapping wall/solid/prop blockers. However, all nine rounded grid candidates around the origin fail the swept native segment check. Five candidates are walkable themselves, but cannot be reached directly from the fractional origin. Ordinary and widened grid A* therefore cannot obtain a start connection. Increasing search bounds alone does not resolve this local gap.

This demonstrates a technical limitation still present in the current runtime. It does not prove that a physically valid route exists: that requires an independently checked local connector. Any candidate must preserve native swept-body/terrain/fluid/gate collision, avoid teleporting, remain bounded and retain results when no valid connection exists.

The corrected-runtime reference and recovery campaigns remain source-frozen. New geometric candidates must be developed in a separate worktree; do not mutate running comparisons or compensate for blocked workers by changing prices, player policy or animal damage. Preserve this negative when evaluating the candidate.
