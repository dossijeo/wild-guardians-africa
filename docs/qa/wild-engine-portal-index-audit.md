# Portal-index candidate: measured rejection

Main source `ceef8c82` still scans every portal in `rebuildEdges`, and also
scans the portal list to find opposite sectors when one sector is committed or
removed. This is effective production code. It is a valid asymptotic candidate
for a sector-to-portal index, but a candidate needs enough portals for that
index to offset its allocation and invalidation cost.

`tools/experiments/benchmark-wild-engine-portals.mjs` uses the checked-in WASM
(SHA-256 `7817ebadc3dfa4c4d32f6197b5c4eb53468ad5f7f23293d72b902c23a7707095`),
Sabana seed 712 and 49 resident chunks. It adds 0, 1, 4, 16 or 64 synthetic
worker portals, calls `lazy_commit_portals`, and alternates count order over
five passes. The raw timings and input hashes are in
`wild-engine-portal-index-audit.json`. Median warm commit times were:

| Portals | Commit time |
| ---: | ---: |
| 0 | 1.78 ms |
| 1 | 1.76 ms |
| 4 | 1.76 ms |
| 16 | 1.81 ms |
| 64 | 2.19 ms |

The day-13 Sabana capture had 71 wall pieces and one intact gate; a later
day-25 capture had 76 pieces and one intact gate. A normal portal refresh is
therefore dominated by the sector-edge rebuild already required with zero
portals. Even 64 synthetic portals added only about 0.4 ms to this operation.
This benchmark does not time all sector commits or prove performance for a
future farm with hundreds of gates, but it does not justify a maintained
inverse index for current representative states.

Decision: retain the simpler linear portal scan. Revisit only if a measured
campaign state shows a substantially larger portal population and material
time in portal scans. No gameplay or navigation code changes in this audit.
