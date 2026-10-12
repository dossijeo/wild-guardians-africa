# Native tick integration: fractional worker departure

Production-main candidate `f1cda984` passes two additional isolated native
locomotion checks, beyond the direct `walkTo` and browser route tests.
The actual `tick` invokes the ordinary worker update, gate animation and
status transition. The worker reaches `(60, 0)` and becomes `home` in both
cases. Reload while the cooperative search is pending preserves that outcome.

| Case | 0.1-second native steps | Reloads | Maximum movement per step | Final status |
| --- | ---: | ---: | ---: | --- |
| No reload | 824 | 0 | 0.24 m | home |
| Reload after step 101 | 925 | 1 | 0.24 m | home |

These step counts are simulated fixture time, not measured wall-clock loading
or GPU performance. The navigation epoch stays 1517; ordinary clock updates
do not reset the search. The ledger remains exactly unchanged. No crates,
tasks, raids, purchases, income or day transition are generated.

## Explicit fixture modifications and limits

The original terminal snapshot is read into a copy. For this locomotion-only
fixture its terminal result and pauses are cleared, time is set to 400,
raids/spells/crops/tasks/crates are removed, completed empty day/night plans
are supplied, and only the archived fleeing worker is retained. Original
terrain, suppression and building/wall geometry are used. This is a synthetic
technical test: it does **not** resume or reverse the historical defeat,
validate economics, prove multi-worker occupancy or establish survival.
The original snapshot bytes and live campaigns are unchanged.

`receipt.json` records the three actual main candidate runtime hashes and
the captured probe/report hashes. `probe-source.mjs.txt` is the exact script
that was run from the main candidate repository root; copying it to a fresh
untracked `.mjs` at that root permits reproduction. Its relative imports must
resolve to that main candidate, not this experimental branch. The report
path must not already exist because the script refuses to overwrite evidence.

The broader/full regression remains live at this checkpoint. No production
merge, completed campaign or physical-device acceptance is inferred.
