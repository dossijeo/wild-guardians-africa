# Returning worker overlapped by a newly built wall

Experimental branch only. The 100-night campaign remains stopped. This is a
navigation correction and isolated reproduction, not balance acceptance.

The frozen v111 snapshot contains worker-6087, an expired day-eight worker in
`fleeing` state on day nine. Its body overlaps intact zarzas wall structure-4425.
Terrain is dry and valid; there are no overlapping props. Ordinary native paths
to both home and centre fail. The worker-service certificate currently tests this
person against the centre even though the engine is sending it home. The
certificate has not been weakened or made to ignore the worker.

The candidate permits only returning/fleeing/incapacitated workers already
overlapping exactly one non-gate wall to leave through its nearest face. The
outward prefix is capped at 0.75 m; its swept-body check excludes only that wall.
All other structures, props, fluids, terrain and moving gate leaves remain
checked. The remaining route uses ordinary native worker navigation. Valid
origins and ordinary farming tasks receive no exception. There is no relocation,
new persistence field, price change or artificial economic transaction.

## Evidence

`v111-worker-return-classification.json` preserves the read-only diagnostic.
`v111-worker-wall-recovery-source-final.json` records actual native `walkTo` movement
from the stopped snapshot. The worker reaches home at (60, 0) after 361 steps of
0.05 seconds (18.05 simulated seconds). The probe reloads the serialized state
after the third step, before completion of the outward prefix. Every displacement
is below 0.5 m; coins, ledger, plants and RNG are exactly unchanged. The measured
movement loop took 120.4 ms on this machine. This is not a campaign or frame-time
benchmark and excludes initial snapshot/navigation setup.

32 focused tests pass across wall recovery, return routing and terrain clearance.
They cover rotated walls, ordinary-task exclusion, water/lava/slopes, props,
additional solids and overlapping walls, gates, continuous actual movement,
mid-prefix reload, an animal occupying the exit, and navigation-epoch changes.
An initial dynamic-blocker test incorrectly required no approach movement; the
native controller legitimately approaches until body clearance is reached. The
corrected assertion verifies clearance and that the occupied exit is not crossed.
No implementation was changed to satisfy that mistaken expectation.

## Remaining limits

This correction does not make an enclosed home reachable without a gate, does
not recover multiple overlapping walls, and does not cover ordinary active
workers overlapped by construction. Impossible recovery still returns null.
Repeated impossible attempts and cold path costs need measurement before a long
campaign is resumed. The integrated worker certificate also needs a separately
reviewed distinction between active service and expired workers returning home.
No claim of fully acceptable simulator performance or 100-night survival follows
from this isolated reproduction.

Reproduce from this worktree:

```powershell
node --test tests/worker-wall-overlap-recovery.test.js tests/worker-return-route.test.js tests/worker-route-clearance.test.js
node tools/probe-worker-wall-recovery.mjs STOPPED_V111_DIRECTORY FRESH_OUTPUT_JSON
```
