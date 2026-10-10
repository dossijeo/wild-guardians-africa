# One Worker, local continuous geometry tasks (OFF)

This branch starts from frozen6d885581, retaining the earlier7900 whole-job control and the roundtrip negative. It is experimental, not App-enabled or production-ready. Simulation, navigation, economics, actor footprints, targets, RNG, clock/calendar and the raid deadline/fallback are unchanged. Centre800 and minimum wage30 are untouched. There is one actual Worker, no additional renderer/RAF/process or external dependency.

## Narrow change

At the first genuine geometry-generator yield, one owned `raid-geometry-suspended` message permits the host broker to send its pending entry. The host then retains separate background geometry and active-entry identities. Geometry completion never releases an active newer entry; cancellation, replacement, malformed/late messages and disposal cannot install a partial result.

All remaining geometry continuations occur locally in that Worker. The same private native generator resumes without restart, at most128steps or soft2ms per task. A lazy native MessageChannel schedules tasks; every eighth local task uses a timer to give the other message source an event-loop opportunity. This port is not another Worker. Environments lacking MessageChannel use the slower timer fallback. The dispatcher prioritizes at most two entries before one geometry slice; bounded queue and owner checks remain. Completed finite graphs alone populate the existing two-item cache. Entry uses a complete matching graph when available; otherwise it repeats native geometry work on its private navigator. No partial graph or cache history is adopted.

Metrics now contain aggregate histograms/counts/maxima, not89220 per-step rows or host acknowledgements. `computeMs` sums time around actual iterator steps; `sliceCpuMs` includes their surrounding slice overhead and therefore overlaps it. Overall elapsed includes scheduling/wait/entry work; none of these nested values should be added to claim a total.

## Preserved negatives

The original first full-reply equality failure remains in `docs/qa/raid-shared-worker-candidate/original/negative-first.tap` and its exact source. The7900 reuse packet had four chunk records versus reference eight. The6d roundtrip variant's7s observation failure and subsequent30s functional completion at11.80–12.20s are unchanged.

This folder additionally retains exact source and TAP for two intermediate local variants:

- `original/local-timer-negative`: one ack and local zero-delay timers still exceeded the original7s observation window; entry arrived (492.38ms computation), but geometry was incomplete when the test disposed its thread. This is not a hang claim.
- `original/local-port-negative`: a continuously recurring MessageChannel completed geometry before the entry reached execution; the entry-first assertion failed. That was a real priority negative, not removed from the archive. The final every-eighth-task timer yield addresses this fairness issue without increasing the7s observation limit.

No observation threshold was tuned to approve the final variant. Preserved negative code is historical input, not executable current-contract regression fixtures. The older6d resume-per-slice tests also remain unchanged in history/current files; final tests exercise the explicitly different one-ack local contract.

## Final directed evidence

Final commands in `receipt.json`: **35/35 PASS** (17broker/local/frame,2actual Node,15original entry-preparer,1physical). Unit cases cover actual continuous generator ordering, two-entry fairness, first acknowledgement, late/newer identity, no partial adoption, cancellation/disposal and finite aggregate counts. The actual Node adapter uses the same producer/dispatcher and only one real thread per run; three runs are sequential. It injects a private listener capability for Node events. This is not a browser native MessageEvent or WebWorker/frame acceptance test.

Input is the retained advanced gzip:103 paid walls/865 living plants, day21/time0 with original null nightPlan, unchanged SHA `1b0f1a153aaf9c7adcb91b394d232886016124316570f3e90df01bb280bb4a0b`. Five canonical radii match independently retained native polygons; complete geometry is adopted with zero main iterator steps and state/RNG serialization unchanged.

| Final CPU observation | Run1 | Run2 | Run3 |
|---|---:|---:|---:|
| Total elapsed ms |2029.19|2331.56|2225.83|
| Host initial call ms |6.02|6.52|6.44|
| Host graph adoption ms |4.08|2.30|2.31|
| Host JSON packing total ms |6.44|7.82|7.59|
| Host synchronous postMessage total ms |2.07|2.03|2.05|
| Entry host queue wait ms |9.94|11.86|10.86|
| Entry Worker queue wait ms |0.04|0.50|0.32|
| Entry computation, graph not complete, ms |597.65|679.96|676.10|
| Entry reply elapsed from posting ms |656.03|731.19|726.65|
| Geometry iterator step sum ms |521.42|687.07|604.01|
| Geometry slice CPU sum ms |545.66|717.90|631.36|
| Geometry slices |756|813|781|
| Max indivisible step ms |25.71|30.99|30.35|
| Max geometry slice ms |27.53|31.17|31.22|

All runs complete89220 iterator steps, one host acknowledgement and zero host resumes. Maximum step phase is `boundary-props-scatter` (`propsAt→Navigation.chunk→scatterWorld`). Soft2ms is explicitly exceeded; moving that work off-thread does not create a hard scheduling bound. Requests total340451 UTF8 JSON proxy bytes; replies total711387/711387/711388. These are JSON proxies, not actual structured-clone bytes. RSS readings are whole-process points, not peak or isolated graph memory. No times are summed across overlapping layers.

In these early-priority runs the graph is incomplete at entry execution, so the entry computes it separately and returns all eight reference chunk records in exact order (26484 JSON bytes). Full entry reply, individual canonical chunk payloads, actual host warmth adoption, walk/segment/path caches and key/proof/geometry match. There are zero omitted-reference-chunk probes in these runs. This additional result does not retroactively make the7900 four-versus-eight packet equality true or cover every interleaving. Ready-graph reuse remains covered by the physical case below and frozen control.

Compared with the earlier7900 observed whole-job total1.04–1.39s, final total2.03–2.33s is still worse. Reduced queue wait is paid for by duplicate native entry geometry computation and cooperative scheduling. These are descriptive CPU runs, not randomized ABBA/net-performance or browser/render measurements. No deadline is declared resolved: an entry still needs598–680ms computation before its reply, and the original cold fallback can still run.

## Physical parity and limits

One actual shared Worker prepared a paid closed enclosure/gate and native crop in Sabana/Saheliana712 for twelve mixed-species animals. Full spawn/RNG matches default preparation; every ordinary0.25s tick matches complete serialization; both restore a save at tick4. All twelve animals exit at their real native endpoints, the raid ends after41ticks and the ledger is unchanged. Initial/final raw hashes are `20566cb86fdeca91548ecf997195eb5938e099182ee93cf9ea81d76035a9f376` / `7cc578fb4475b3e5148c629f991d66bed7256ce670153d1c5197ccd975d20416`.

The physical test also computes the baseline synchronously on its host while the Worker is preparing. Its timing is deliberately not a performance comparison: observed step78.13ms and host queue634.71ms remain in the original TAP and are not hidden or subtracted. In that interleaving geometry completes first and entry legitimately reuses the complete graph. This case proves physical parity, not responsive rendering or guaranteed entry-first completion when the host is itself blocked.

Read-only verifier: `python tools/verify_raid_worker_local.py`. It checks current source/payload hashes and historical manifests against their actual frozen git blobs, all preserved negative TAP/source bytes, finite scoped counters, exact canonical full replies in the advanced runs, original state hash and physical snapshots/route samples. It writes no self-referential output.

Remaining gates: actual browser ownership/rendering, current-main integration rather than replacing its different worker implementation, busy/moving/edited worlds and all biomes, deadline/cold fallback, resource lifecycle under real frames, total/peak cost and whether duplicating geometry is justified. No campaign, CI, GPU, PR, main integration or production activation occurred. Further architecture changes require review of these concrete limitations.
