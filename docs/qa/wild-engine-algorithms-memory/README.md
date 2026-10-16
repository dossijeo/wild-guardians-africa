# Wild Engine algorithm and linear-memory audit — first baseline

## Route-slot free-list experiment (rejected)

The native intent code on this experimental branch scanned `routeSlots` at
seven acquisition sites. A prototype replaced those scans with one LIFO free
list, preserving handle generations and clearing the list on session reset.
The candidate compiled and passed 25 native intent tests, including a new
regression that reuses a released slot without reviving its old handle.

The frozen Desert day-15 route-slot benchmark creates and cancels synthetic
actors using a physically valid saved route. It includes intent bookkeeping,
segment validation and JS↔WASM calls, so it measures the whole operation
rather than claiming to isolate the scan. The same source checkout was built
with and without the free list using pinned Emscripten 6.0.12, then run in
ABBA order on one CI host ([run 38878468478](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38878468478)).
The 16 MiB baseline WASM SHA-256 was `d12355b1a636f1a856abd1cd6b3b6ff6177162b0ada5a7828df036802227b9d2`;
the candidate was `0bcd51ff6691bd2194301982d89c16d979bbf63d1f79b52e38adf488afcabda3`.

| Concurrent routes | Baseline acquisition median | Free-list median | Difference |
| ---: | ---: | ---: | ---: |
| 10 | 0.093 ms | 0.092 ms | −1.0% |
| 50 | 0.384 ms | 0.402 ms | +4.5% |
| 150 | 1.119 ms | 1.298 ms | +15.9% |
| 300 | 2.215 ms | 2.177 ms | −1.7% |
| 600 | 4.452 ms | 4.453 ms | +0.0% |

Each median excludes the first wave and uses six samples from the two runs of
each variant; the four raw JSON reports are retained alongside this file.
The candidate has no reproducible end-to-end benefit and is **not adopted**.
This does not prove that slot scans are free, only that replacing them is not
a valuable optimization at these sizes. The benchmark and handle regression
remain to evaluate future changes. A local Emscripten 6.0.12 installation
reproduced the candidate's exact WASM hash and the same 25 passing tests.

The next candidate is shared exploration for multiple route destinations,
based on the frozen Sabana day-17 repair fixture. Repeating its repair-access
preview three times with the unchanged baseline measured 487.6/484.4/500.5 ms,
60 native route queries total (20 per preview), and 1,335.0 ms inside those
route calls across the three previews. The summed route-call time exceeds
top-level preview time because the benchmark also times witness queries
separately. A cold four-query batch was 214.6 ms versus 230.2 ms sequentially;
an identical warm batch was 0.16 ms. This confirms that batching JS↔WASM
crossings alone does not remove cold graph work after provisional topology
changes. Any multi-destination prototype must retain the physical route proof
and preserve preview isolation.

This branch starts at `3361c06a`, the current experimental native-intent
branch, without changing gameplay. It is separate from PR #53. Its initial
baselines used the 4 MiB production binary; the later 16 MiB activation is
recorded below. The experiment is not yet a recommendation to merge.

## Effective code and candidate checks

`spatial-game-session.js` and the game entry point use `spatial-world.js` and
`spatial-intent-bridge.js`. `lazy-sectors.cpp`, `spatial-route-planner.cpp` and
`spatial-intent-state.cpp` are linked into the active `spatial-savanna.wasm`.
`lazy-sectors-adapter.js` and `spatial-core-worker.js` are also used by
experiments; their standalone timings must not be presented as game-loop
timings. The build script currently sets `INITIAL_MEMORY=4194304` and
`ALLOW_MEMORY_GROWTH=1`.

The source still has `visited.assign(maxNodes,0)` in both `lazy_connected`
and `lazy_route`; `lazy_route` also clears `previousNode`. `rebuildEdges`
visits the full portal vector. Several route-handle acquisition sites scan
`routeSlots` for an inactive slot. `residentPropBlocked` and `cropOccupied`
have the linear checks described in the request. These are confirmed
algorithmic candidates, **not yet measured bottlenecks**. The first workload
profile below cautions against assuming all slow time belongs to BFS.

## Frozen 24-night CPU profile

`manglares24-profile.json.gz` and `manglares24-intent.cpuprofile.gz` retain
the full daily report and V8 CPU profile from:

```powershell
$env:WILD_ENGINE_SPATIAL_SERVICES_WASM=(Resolve-Path 'src/world/hierarchical-wasm/spatial-savanna.wasm').Path
$env:WILD_ENGINE_SPATIAL_ADVICE='1'
$env:WILD_ENGINE_DEFENSE_POLICY='expanding'
node --cpu-prof --cpu-prof-dir=docs/qa/wild-engine-algorithms-memory --cpu-prof-name=manglares24-intent.cpuprofile tools/experiments/run-native-intent-campaign.mjs 24 manglares 712 good docs/qa/wild-engine-algorithms-memory/manglares24-profile.json intent
```

The report embeds source `3361c06a`, WASM SHA-256
`ff719cfebd15fe0aa11a4ed85abc2912f35527e84e635699429489660a1fd8e7`,
input-file hashes, parameters, daily state hashes and verified raid evidence.
All 24 day-end state hashes match the prior unprofiled 30-night campaign.
The profiler increased day-20 `Game.tick` from 98.16 to 143.51 seconds and
day-23 from 112.32 to 165.81 seconds, so its elapsed times are **not** a
speed baseline. It samples the same physical campaign for hotspot diagnosis.

The profile contains 1,493,568 samples. The largest individual self-sample
counts are 342,393 in unnamed WASM function 93 and 322,428 in JavaScript
`gcd` (`money.js`). Other large WASM functions have 133,913, 102,645 and
86,251 samples. Function 93 is reached from route planning, native task
planning and crop-group advice. Without a symbolized WASM build we cannot
assign it to a specific C++ algorithm. The `gcd` work belongs to exact game
arithmetic and must be separated from Wild Engine optimization. The profile
also cannot attribute the two daily spikes to one function without a
time-windowed trace. No algorithmic change is justified yet by this profile
alone.

## Linear-memory baseline

`tools/experiments/benchmark-wild-engine-linear-memory.mjs` instantiates
the same production WASM binary for isolated 1-, 9-, 25- and 49-chunk
Savanna worlds. It records committed linear-memory bytes after world
generation, sector builds, 100 mixed-profile route requests and one wall
addition/removal. It also records calls to the Emscripten memory-growth
notification import. That notification count is **not** a proof that every
possible internal `memory.grow` was observed. It does not measure live C++
heap usage, process RSS, user-facing frame pauses or legal-campaign scale.

With the shipped 4 MiB initial memory, 1 and 9 chunks stayed at 4 MiB and
generated no growth notifications. The 25-chunk case ended at 5.3125 MiB
with 4 notifications. The 49-chunk case ended at 10.1875 MiB with 33
notifications, largely during sector construction and the first route
queries. Exact phase timing and notification timestamps are retained in
`linear-memory-baseline-v2.json`.

The 49-chunk synthetic workload was repeated in order 4/16/16/4,
4/32/32/4 and 4/64/64/4 MiB. For this experiment the script explicitly
pre-grows memory after instantiation; this is **not** a rebuild with a
different `INITIAL_MEMORY` setting and excludes any difference in module
instantiation. The 4 MiB runs finished at 10.1875 MiB with 33 notifications;
all pre-grown runs had zero subsequent notifications and retained their
full 16/32/64 MiB committed capacity. Whole-workload medians were about
1501 ms (4 MiB, six runs), 1451 ms (16 MiB, two), 1477 ms (32 MiB, two)
and 1476 ms (64 MiB, two). This small and non-monotonic difference in a
synthetic workload is insufficient to raise the production default.
`linear-memory-abba-*.json` preserve every unaggregated run and source hash.

The same seed and 49-chunk shape were then sampled once in each of the six
biomes, with the unchanged 4 MiB binary. Final committed memory ranged from
9.625 MiB (Desert) to 13.5625 MiB (Mangroves). Growth notifications ranged
from 24 to 52; the 49-chunk Mangrove nav builds took 1.92 seconds in this
synthetic run. `linear-memory-biome-*.json` retain the four chunk sizes,
phase timings and every observed growth notification for each biome. One
sample per biome is a capacity probe, not a stable performance comparison.

Run the baseline with:

```powershell
node tools/experiments/benchmark-wild-engine-linear-memory.mjs src/world/hierarchical-wasm/spatial-savanna.wasm report.json 0
```

The fourth argument is optional explicit pre-growth in MiB; the fifth and
sixth select biome and seed (defaults: `sabana`, `712`). The subsequent
compiled variants and 14-night campaign are described below. Platform memory
checks, representative restored games and C++ heap/capacity instrumentation
remain open; linear capacity alone does not answer those questions.

`run-native-intent-campaign.mjs` now accepts the optional
`WILD_ENGINE_MEMORY_PROFILE=1` QA flag. It samples committed linear bytes no
more than once per five simulated seconds, records observed size changes and
one entity-count snapshot per day, and leaves ordinary runs uninstrumented.
`manglares1-memory-smoke.json` confirms the trace is emitted in a real
one-night campaign; it is only a smoke test, not sustained-memory evidence.
The opening sample was 4 MiB and four size changes were observed. The next
campaign must extend this trace beyond the presentation nights and compare
source-identical uninstrumented timing.

`manglares14-memory.json.gz` now contains that sustained sample: Mangroves,
seed 712, good policy, expanding defense, native intent, 14 completed nights.
It includes all daily game-state hashes and entity counts. All 14 state hashes
match the previously retained uninstrumented run. The sampled linear-memory
capacity rose from 4 MiB at opening to 18.875 MiB, with 15 observed size
changes; the last observed change was during day 9. It remained at 18.875 MiB
through the end of this run. Committed capacity crossed 16 MiB late on day 6
(the following day-end sample is labeled day 7),
so a 16 MiB initial allocation would still grow in this particular legal
campaign. The instrumented run took 409.27 seconds against 402.52 seconds in
an earlier uninstrumented run (1.7% difference); these were not an alternating
A/B timing experiment, so the difference cannot be assigned to sampling or
memory growth. The sampled changes are not necessarily every native
`memory.grow` call and cannot reveal a pause's cause at frame resolution.

`tools/build-spatial-savanna-wasm.sh` accepts an optional
`SPATIAL_INITIAL_MEMORY` byte value. The experimental workflow builds the same C++ source with true
4/16/32/64 MiB initial memories in a pinned Emscripten image and repeats the
synthetic workload three times per biome. Its artifacts include the binaries
and full reports. Results from that workflow must be reviewed before drawing
any conclusion about the compiled setting; the local pre-growth experiment
above answers a narrower question.

The pinned Emscripten CI workflow has now built all four true variants. Its
4 MiB binary has the shipped SHA-256 above; the 16, 32 and 64 MiB binaries
have SHA-256 `d12355b1a636f1a856abd1cd6b3b6ff6177162b0ada5a7828df036802227b9d2`,
`cd616d28674d294c2a71778ee9efc9a49acf249c061c18bee3e5e8c5961db21b`
and `54a9d1d4dc94f6ca831d3032eac238c96701ed6d8d92d6211d2d24fa86d6c0e4`.
For the frozen 49-chunk workload, all 72 biome/repetition/variant reports
agree on route-result hashes. The 4 MiB variant ended between 9.625 and
13.5625 MiB depending on biome and observed 24–52 growth notifications per
run; the larger variants reported zero. The GitHub jobs ran concurrently on
different runners, so their elapsed times are **not comparable**. The
downloaded raw CI artifacts are available on workflow run `38859620212`;
`benchmark-wild-engine-initial-memory-abba.mjs` repeats the compiled variants
sequentially on one host to obtain an interpretable timing comparison.
`compiled-memory-abba-manglares.json` contains two ABBA cycles per alternative
using the same frozen 49-chunk Mangrove workload and identical route hashes.
Paired candidate/control time ratios were 0.954 and 0.969 for 16 MiB, 1.029
and 0.981 for 32 MiB, and 1.036 and 1.026 for 64 MiB. A lower ratio is
faster. The 16 MiB result is a modest, repeatable synthetic improvement on
this host; it does **not** establish faster real campaigns or prove that
memory growth caused the full difference. The 32 and 64 MiB results do not
justify their larger initial capacity.

That comparison has now completed: `manglares14-16mib.json.gz` records 14
legal campaign nights on the compiled 16 MiB binary. All 14 daily game-state
hashes match both the 4 MiB instrumented run and the earlier uninstrumented
reference. Total elapsed time was 405.47 seconds versus 402.52 seconds for
the earlier 4 MiB reference, a 0.7% increase. Per-day `Game.tick` ratios
vary on both sides of 1. This is one sequential campaign on each variant,
not a sufficiently repeated campaign A/B result. It shows no reproducible
end-to-end speed gain by itself. The 16 MiB build remains a useful capacity
candidate for smaller and medium scenes; its capacity would still grow in
this 14-night Mangrove campaign.

`bfs-baseline-sabana-animal.json` and `bfs-baseline-manglares-animal.json`
freeze 100 direct graph-query pairs each and preserve results and route
hashes. In warm rounds, 100 connectivity queries took about 2.6–5.5 ms and
100 complete `lazy_route` queries about 5.9–12.6 ms, depending on biome and
round. Many requests are `unknown` because the synthetic sample lies near
resident boundaries. The measured cost of the whole query set is small next
to the real campaign's hundreds of seconds; generation stamping may still
help at higher query counts, but these measurements do not justify changing
production code yet. A workload-specific profile must first attribute the
large unnamed WASM function to a concrete algorithm.

## Activation decision

After reviewing these results, the project owner elected to use 16 MiB as
the initial capacity because it removes growth in the tested small/medium
synthetic worlds and has no measured material campaign regression. The
build-script default and checked-in WASM binary in this **experimental
branch** are therefore updated to 16 MiB. Main remains unchanged pending
review of the stacked PRs. This is a capacity choice, not a claim that the
full 14-night campaign becomes faster; it still outgrows 16 MiB and remains
dependent on `ALLOW_MEMORY_GROWTH=1`. The `SPATIAL_INITIAL_MEMORY` override
keeps 4, 32 and 64 MiB reproducible for later comparisons.

## Functional and packaging checks for activation

The web build succeeds and packages the 16 MiB WASM with SHA-256
`d12355b1a636f1a856abd1cd6b3b6ff6177162b0ada5a7828df036802227b9d2`.
Web-asset validation passes. The native-intent and validation CI jobs pass;
the Windows job was still running at the time of this report.

The full local suite was run with both compiled variants on the same source.
The 4 MiB run had 4,416 tests, 4,342 passes, 32 failures and 42 skips.
The first 16 MiB run had 4,340 passes and 34 failures. All 32 failures from
the 4 MiB run also appeared with 16 MiB. The only additional failures were
two prototype tests asserting the historical literal `4194304` bytes after
small navigation workloads; they did not report route or simulation changes.
Those tests now capture their instance's initial memory size and assert that
the workload causes **no growth**, preserving the intended test on both
variants. The affected prototype file passes all 59 tests with 16 MiB.
The complete suite was rerun after the test correction and base-branch sync:
4,416 tests, 4,343 passes, 31 failures and 42 skips
(`npm-test-16mib-final.tap.gz`). Comparing failed test names against the
archived 4 MiB run finds no new failures; the only failure removed is the
dense-raid reload assertion corrected in the base branch. The earlier full
TAP logs, focused passing log and 4 MiB physical raid reproduction remain
archived as historical evidence. The dense-raid reload
failure was subsequently traced to the test checking a straight chord across
a two-leg turn. The updated base branch checks both real movement legs and
passes all four terminal scenarios; this branch re-ran those four scenarios
and the 59 spatial prototype tests after synchronizing with the base. No
engine movement or collision code changed for that finding. Other shared
failures include old 100-night victory expectations and unrelated balance/UI
assertions; they have not been hidden or rewritten in this performance branch.

## Next isolated measurements

1. Symbolize or instrument the hot WASM functions, then profile sector
   rebuild, BFS clears, portal scans and route-slot scans separately.
2. Benchmark generation stamping as one isolated candidate against the
   unchanged binary on frozen navigation inputs; compare exact states and
   `found`/`blocked`/`unknown` results.
3. Measure portal cardinality and topology-change frequency before adding
   an inverse index; measure route-slot scan lengths before adding a free list.
4. Expand linear-memory traces to restored games and large legal farms,
   recording actual entities and sectors alongside committed pages.
