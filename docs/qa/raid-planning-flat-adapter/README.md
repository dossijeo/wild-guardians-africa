# Complete flat adapter for the raid planning domain test

QA-088's synthetic navigation object had `path` and `walkable` but no `segmentClear`. Main's current runtime could use it; the frozen e040 cooperative entry-packing runtime also calls `segmentClear`. This caused a pre-existing fixture failure while checking the area candidate, before that candidate could reach its assertions.

Root ran the original unmodified frozen runtime in `campaign-horde-proposal`, selecting only QA-088:1 failed,7 skipped by test-name filter,239.1533ms. Diagnostic excerpt from that original tool output:

```
error: 'nav[method] is not a function'
navigationCall (src/world/navigation-steps.js:11:51)
connectedRaidPackingSteps (src/world/raid-entry-packing.js:32:50)
chooseRaidEntrySteps (src/simulation/raids.js:125:184)
```

`baseline-source-blobs.txt` records exact git-blob matches against e040ea6f for seven relevant files, including the test, Game, raids, rules and entry-query helpers. This proves the same failure occurs without the new area implementation; it does not excuse future candidate failures. This archive keeps an excerpt, not an invented complete raw baseline stdout file. The subagent separately observed7 passing/1 failing in the original eight-test suite.

The fix explicitly adds `segmentClear:()=>true` to this already-flat domain adapter and documents that it cannot certify physical navigation. Existing clock, mandatory first incursion, hit budget and save/reload assertions remain unchanged. No production source or original frozen worktree was edited.

Current main with the completed adapter:8 passed,0 failed/skipped,274.078ms; full original command output is retained in `main-complete-adapter-tests.txt`. The candidate must still run its own integration/physical tests and its own repaired broad suite.
