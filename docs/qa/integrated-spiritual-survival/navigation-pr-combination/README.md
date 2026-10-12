# PR25 + PR26 functional composition

The candidate worker departure fix (PR25, `30b1e2dc`) and exact watering cache (PR26, `ccb808d4`) were combined in memory without changing either worktree or the live balance campaign. The test imports PR25 Game/Navigation, then redirects only its work-points import to PR26's wrapper. Its uncached control is the unchanged PR25 Game. The report records the five changed runtime source hashes.

All four comparisons pass with exact serialized state equality after every tick:

- Isolated fractional departure: home after 824 ticks.
- The same isolated departure with mid-search save/reload: home after 924 ticks.
- Recorded Canyon watering fixture 1: 300 ticks, reload after tick 150.
- Recorded Canyon watering fixture 10: 300 ticks, reload after tick 150.

The departure fixture deliberately clears its historical terminal result, raids, plants, crates and tasks in copies to isolate locomotion. It does not revive or count a defeated campaign. The watering fixtures preserve their original simulation state. State equality includes ledger, RNG, tasks and worker state; this is functional compatibility evidence, not a speed/FPS measurement or a full survival campaign.

Original report, exact test script and stdout are retained losslessly with hashes in `receipt.json`. To reproduce, extract `script.mjs.gz` to a local `.mjs` and run `node SCRIPT PR25_WORKTREE PR26_WORKTREE NEW_REPORT_PATH` while both tested revisions are available. The script uses separate navigation instances and tests actual native ticks; it does not mutate shared modules or inject changes into running simulations.

PR CI acceptance and final merge verification remain independent requirements. This composition check does not authorize merging experimental military ancestry or modifying the frozen live campaign.
