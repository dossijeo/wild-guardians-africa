# Native night-41 retreat repair

The historical candidate-4 campaign stopped technically after 40 completed
nights. Its sole remaining lion had zero attacks, radius 0.85, and an exhausted
4096-pop half-metre exit search. This was not a native defeat. The archived
snapshot remains unchanged; all 464 original declared sources were rechecked
in the original campaign worktree (`historical-source-audit.json`).

An expanded diagnostic search found a 161-point physical route, with every
leg passing native full-radius walkability and swept collision tests. The
failure was a search-bound limitation, not proof of an impassable enclosure.

The repair retains the original 4096 bound and existing grid-bridge priority.
Only when that bridge exhausts does the half-metre frontier resume with a
16384 bound. Each call still pops at most eight half-lattice entries. The
quarter-metre search retains its original 4096 limit. Persistence explicitly
validates the saved bound, finite heap/map sizes, parent edges and costs;
historical untagged frontiers keep the 4096 validation limit until resumed.

No radius, obstacle, gate geometry, walkability, animal hits or balance recipe
is changed by this technical repair. It neither teleports an animal nor removes
one to finish a raid. It accompanies, but is distinct from, candidate-5 pressure.

## Validation

- Three retained night-41 tests pass, including original geometry epoch,
  pending-search save/load deterministic route, unchanged ledger/structures,
  and actual native retreat movement ending the raid.
- 57 retreat tests pass across grid/quarter/world-aligned corridors, Canyon,
  paid defenses, props, safe exits and historical Saheliana failures.
- After strengthening quarter-bound persistence, 59 combined pressure,
  lifecycle, entry, quarter and night-41 tests pass. The final three night-41
  tests were rerun with explicit saved geometry-epoch reconstruction.
- An initial regression delayed the historical night-17 grid bridge when the
  expanded lattice was given priority. This was corrected by preserving the
  original bridge priority; the negative log is retained.

Reproduce the retained failure with:

```
node --test tests/raid-night41-exit-search.test.js
node tools/check-night41-expanded-exit.mjs
```

The fixture is the already tracked
`docs/qa/integrated-spiritual-survival/recovery-night41-technical-stop/partial-state.json.gz`.

## Performance scope

Final AB/BA uses native geometry and original saved epoch, a 2000-call diagnostic
cutoff, and the original 4096 bound versus the repaired 16384 fallback. Both
original runs have no route; both repaired runs find the valid 161-point route
in 1238 calls. Repaired total connector CPU is 3.14/3.16 seconds spread over
calls; p95 is 5.04/4.48 ms, p99 8.10/7.52 ms. Sampled search JSON peaks near
520 KB, versus 327 KB for the stuck original; this is serialized state size,
not a RAM/VRAM measurement.

Rare bridge calls still reach 162/207 ms (original 212/219 ms). This is existing
native bridge work, not evidence of uninterrupted rendering. The test measures
connector CPU on a shared desktop, not GPU, whole-frame time or mobile acceptance.
The repair allows physically valid completion but does not claim a general
performance improvement. Preserve these spikes as an optimization limitation.

The historical campaign is not resumed, reclassified or used as a 100-night
win. New campaigns require a newly reviewed source inventory; old launchers
correctly reject the combined candidate-5/retreat changes. Main remains unchanged.
