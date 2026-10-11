# v114 terminal native retreat failure

The original v114 process and session terminated with exit code 1 at 2026-10-11 11:29:18 UTC. Receipt status is `incomplete-harness-error`, with ten complete rows and no native result. PID 44104 was independently missing. The simulated-day safety bound detected an unfinished raid; this is neither economic defeat nor an observation timeout. No automatic restart was performed.

The retained snapshot is day 11, time 600, elapsed 8400.000000012134. Raid `raid-11-night` contains 16 animals: 15 gone and warthog `animal-10727` retreating with zero hits, position `(70.59720968496802, 5.762671916920792)`, destination `(25, 166.65)` and no path. Original receipt, partial report, snapshot, progress, journal and launch hashes are preserved unchanged.

The exact partial-finance audit reconciles 2,054 unique paid ledger entries against the snapshot, with 1,001 coins. It does not establish raid completion or balance acceptance.

Read-only native route diagnostics on a copy find valid terrain and walkable start/exit, but integer-grid routes fail at margins 16, 32 and 64. Seven short local connectors pass original swept checks. Moving the proposed connector exactly north by 4, 8 or 16 metres yields native routes with respectively 161, 157 and 149 points. No actor is moved during these probes and serialized state remains unchanged.

This identifies an available physical route missed by the retreat connector sampling. The fix must include such world-aligned connector proposals while retaining incremental bounded search, original body radius, swept geometry, fluids, dynamic bodies and actual movement to the exit. Teleporting, declaring the animal gone, extending its attack budget or weakening walls would not address this failure correctly.
