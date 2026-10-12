# Q15 native short campaign alongside cinematics

Loaded source `49051add` (QA observation wrapper) on integrated mechanics `ae846841`. Q15, agricultural mechanics, original crop economy, pressure, seed/profile and player decisions are unchanged. Case: good / seed123 / Sabana / Mapungubwe / olderFemale, cashflow, shore zarzas defense from day6, breach-first repairs, rolling funding. Requested seven nights; no100/180 launch.

Original launch:

```
node --cpu-prof --cpu-prof-dir=.cache/q15-profiles --cpu-prof-name=q15-good-sabana-123-7.cpuprofile tools/run_native_short_observed.mjs --out .cache/q15-parallel-short-49051add-good-sabana-123-7 --days 7 --seed 123 --strategy good --labour-policy q15 --crop-policy cashflow --defense-policy shore --defense-start-day 6 --repair-policy breach-first --defense-funding rolling --biome sabana --culture mapungubwe --profile olderFemale
```

Actual PID35752/session46287, terminal exit0, PID absent. Native source/protocol record contains441 hashes and no tracked changes. Runtime remains unchanged. Native state serialize/deserialize roundtrip was checked exactly before archival. Every daily finance row reconciles with the real ledger. Gzip payload hashes preserve original uncompressed bytes as well as compressed bytes.

## Observed result

Seven nights completed, day8/time0, no defeat and no100-night victory. Cash731;440 physical deliveries;780 coins charged for native walls; zero repair settlement/payment. Native delivery/raid/repair observers report verified coverage. Zero paid repairs is not successful maintenance. Full daily finances, actor budgets, defense decisions and final snapshot remain in originals.

Recorded inactivity1456/2100=69.3333% is a **historical observation only**. The subsequent explicit user instruction removes inactivity as a balance acceptance criterion because agricultural magic provides unlimited actions. Original flags/protocols are not rewritten or relabeled. Future acceptance prioritizes survival, physical damage/defense, actual ledger and execution times, retaining unlimited definitive magic. Seven-night survival does not establish100-night balance or any other seed/biome.

## Technical bottlenecks

Wall duration from native start10:44:12.827Z to terminal10:54:50.700Z is approximately638 seconds.2711 decision-to-observation windows total25.067 seconds, maximum6886.166 ms (night7/time400). A post-tick snapshot and observation for that slow window are preserved. The window includes Game.tick, agriculture and accounting/evidence observers; it excludes the preceding player decision and entry presentation. One window exceeded2 seconds, so the predeclared three-window cooperative diagnostic stop was not triggered. No claimed pure Game.tick time or real-renderer result.

The full main-isolate V8 profile spans638.258 seconds. Disjoint ancestry buckets:558.068s in nativeServiceComponentProof;17.575s in other nativePerimeterProof work;23.879s beneath function tick;38.736s other/idle/GC/startup work. Profiles include sampling, inspector and concurrent-cinematics overhead; these are diagnostic descriptions, not isolated performance acceptance or summed overlapping timings.

A separate live5.266-second sample found4.965 seconds within nativeServiceComponentProof → nativePerimeterProof → quote → defense policy act → native campaign. No debugger pause or Runtime.evaluate was used. The first raw response has a PowerShell VoidTaskResult prefix; it is preserved unchanged alongside a separately parsed JSON derivative. This diagnoses the large decision-stage cost outside the tick window; it does not erase the distinct6.89-second tick/observation stall.

Important attribution: the completed defense report has100 decision records;98 have no new contour candidates, one has1 candidate and one has19. The costly day7 construction search evaluates different candidate geometries. A simple multi-entry whole-proof cache may therefore have no useful exact hits and is not assumed to solve this bottleneck. Next work should preserve decisions/ledger/full state and measure an exact geometry-query cache or safe amortization AB/BA on a short legal replay before another campaign. No policy or economic adjustment is justified from these timing observations.

## Execution constraints and preserved setup failures

Initial regular worktree creation from6f7ced54 failed terminal session47979 at asset checkout with no disk space; Git removed its failed checkout. No campaign was running then and no unrelated process/worktree was stopped or deleted. The successful worktree is sparse (assets/unrelated QA/tools sources excluded), with matching runtime/config files and a node_modules junction to the existing installation. Import preflight initially reported missing three before that junction; this was not a game defeat. The checkout was then fast-forwarded to the explicitly specified integrated branch ae846841. Q8/pre-reform controls were not used to approve the current mechanics.

Observer-only contracts:3/3 PASS,97.2482ms; syntax passed. Before launch, git diff against ae846841 for runtime/content and the frozen runner/Q15 policy was empty. No changes were made to loaded source during the run. Source hashes were verified again at terminal. No other simulation process was active at initial inventory; foreign CUA/server processes were left alone. No GPU/native-browser/CI work is included.

Verify preserved evidence:

```
node tools/audit_native_short_archive.mjs
node tools/audit_native_short_archive.mjs docs/qa/native-balance-parallel-short FROZEN_SOURCE_ROOT
```

The source-root option compares all441 original loaded-file hashes; a future modified cache candidate must be checked against the frozen original source, not relabeled as the same loaded code.
