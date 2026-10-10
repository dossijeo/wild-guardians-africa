# Root review and current-main reproduction

Root verified all six byte-exact archive payloads from `bd679cc8` and ran its native integration test against that frozen historical worktree: 1/1 PASS, 1400.5012ms total. No campaign was rerun. The historical diagnostic relies on that worktree's generator/cooperative entry implementation and is not installed as a current-main test.

Root separately reproduced the defect on main `9f0f65ed`, using its actual synchronous `computeRaidEntry`, ordinary paid commands and native Navigation. `root-reproduction-source.mjs` retains the exact script originally run as `.cache/root-paid-enclosure-main.mjs`; rerun it from that original relative location against the frozen main commit. `root-main-original.json` is the untouched output. Command exited0 in1.0108 seconds; this is a diagnostic duration, not a gameplay benchmark.

The native enclosure bounds are[85,6.2,92,17], with17 paid pieces and495 actual remaining coins. A warthog radius1.1 receives entry(88,12.1) and exit(88,15.1), both inside. Direct and prepared entries are equal and simulation/RNG serialization is unchanged. No animal was spawned or advanced; this proves candidate selection, not an historical campaign trajectory.

Correction is authorised on a separate branch based on current main. It must exclude interior candidates using real physical geometry, support exterior approaches near the defended perimeter, and reject stale prepared candidates. Preserve legal navigation, actor radii, costs, damage, RNG allocation, budgets, target exclusivity and introductory protection. Do not transplant the historical generator architecture or promote economy/horde parameters. Review the implementation and bounded regressions before running another campaign.
