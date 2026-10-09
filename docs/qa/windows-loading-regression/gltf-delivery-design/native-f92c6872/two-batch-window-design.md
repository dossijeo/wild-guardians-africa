# Two in-flight compiler batches: feasibility/design only

Parent requested evaluation after the originalf92 failure. No implementation, flags, new tests/build/CI/native/GPU or promotion. Runtime unchanged. This is an alternative to the isolated sky scheduling proposal, not an additional combined candidate.

## Measured boundary and limit of prediction

At the90s gate job14/world batch10 of77 is active, pending resident Basic ground program20 for5.3734s. Only10 batches submitted,61plus cached batches still unsubmitted. The warm-world parent11.422s includes earlier jobs; the warmGPU21.5125s also includes staging and other nested work. These cannot be added. Program20 firstObservedSelection job14 is selection metadata, not creation time. There is no demonstrated budget or poll CPU bottleneck: the current core immediately polls and completes already-ready programs without a forced timer/RAF.

Serial await prevents batch11 from being submitted while batch10 waits. A queue of exactly two can submit one next group during that wait, potentially overlapping preparation of a genuinely different recipe. It cannot make20 complete, and can offer no benefit if next batch selects the same20, a single driver serializes all work, or submission harms rendering. It also does not address the29.4s preworld or all other World resource waits. No numerical speed prediction or guaranteed90s pass follows.

## Comparison with rejected implementations

Sourcea5957eb0 loading-programs.js retains historical parallelReadiness: each batch is submitted with the same CPU budget and an independent per-job readiness Promise pushed into an unbounded pending array, drained only after all objects have been submitted (or abort). The historical parallel-per-group run37935930877 failed; keep its raw. This allowed up to all group pollers/resources in flight.

The same historical source implements collectiveReadiness: every batch submitted, snapshot all material programs into one deduplicated union, then one final poll after all submissions. Run37944109466 failed. Later37946684375 also combined that union with sky/model overlap. None approves a recipe. The proposed queue differs structurally: at most two original per-job selectors/pollers/material views exist in flight, and submission back-pressure applies after every second pending group. It retains individual selection/check/deadline, not a whole-scene dedup union. Sharing a program between jobs still means duplicate bounded polls, not a new compiled variant.

Full resource overlapf738/run37998755565 separately failed; do not enable it or any shared-ground/prefetch/parallel/collective flags in this comparison. Normal recipe remains serial unless a new opt-in is separately authorized.

## Proposed algorithm preserving actual compilation

Use the original compileLoadingPrograms once for every unchanged object view, original order, batchSize8, complete target scene, screen target restoration and all material variants. Do not clone/reparent/filter objects or predict shader cache keys. Its synchronous renderer.compile and program snapshot run before returning the Promise as currently. Maintain the existing CPU16ms yieldWork/recordWork per submission, including its epoch tracking/cancellation and real RAF budget behavior; no new fake await or unconditional RAF.

Own one outer AbortController for this invocation, forwarding original signal and checking cancelled/epoch/context through each original job. Attach a settlement/rejection handler immediately to every returned readiness Promise, before any budget yield, to avoid unhandled late rejection. Maintain an active Set limited to two entries, with scalar ordinal/Promise and first original error. Before another submission when two unsettled entries exist, await the existing jobs' first settlement, remove settled entries, then recheck error/lifetime. Never leave a third readiness job outstanding. Finished jobs can be removed during budget awaits without an extra readiness query.

After last submission, join all remaining jobs. Success requires every original job fulfilled, no invalidation and the existing downstream depth/bindings/textures/draw/fences. On synchronous submission/selector/clock/callback fault, first job rejection, owner cancellation, context loss or epoch change: stop new submissions, abort the outer owner, drain all outstanding original jobs to settlement, remove listeners and clear Promise/view references. Preserve the first real error, not a cleanup error. Draining must not rely on rendering continuing; core waitGpuPreparation already listens to AbortSignal. Check that timeout remains the same original per-job30s and whole native90s; no added queue timeout or deadline reset after waiting. Restore screen state synchronously exactly as existing compile does.

Observer event definitions remain per original job. At most two active job rows; no flattened sum. program associations may include the same native ID and are not exhaustive consumer lists. No cache-key/program merging or new GL/readiness calls. OFF branch should use existing serial loop without new owner/Set/scheduler allocations.

## Contracts required before review/native authorization

Actual compiler/core doubles preserving original selection: all variants (including overwritten background/shadow/depth variants) remain selected; exact readiness order/count per job unchanged, apart from inter-job interleaving explicitly tested. Actual batch8views/target reference/order and count identical. Pending controls must prove two jobs submit while either unresolved and a third cannot submit until one settles; resolved jobs do not force RAF; existing real yield CPU threshold remains16.

Errors before await/program selection, first/second async rejection, pending sibling abort drain, external abort while budget RAF suspended, context loss/recovery latch, epoch replacement, deadlines, callback/getter throws, screen/viewport/scissor restoration before waiting and cleanup error handling. First error exact, no unhandled rejection, no post-abort readiness query/submission and all per-job timers/listeners released. Unknown/missing variants still fail. No skipped world/depth/draw/fence stage or quality change.

If source and contracts are approved, one normal90s original New plus original native fixture/minimize would be required. Compare to source-matched serial control if authorized; randomNew/runner/cache/order variation prevents a causal speed claim from old raws. At least record queue high-water2 and actual original job identities; these are logical bounds, not RAM/VRAM measurements. Do not add other optimizations to this candidate. No retry just because a run fails before reaching the changed boundary.
