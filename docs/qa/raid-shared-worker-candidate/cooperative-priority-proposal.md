# Next variant: interruptible geometry scheduling inside the same Worker

Frozen control is `7900a94bbbe84bf839fed9ca0a52ae62846d2d2b`. Do not alter its receipt, negative full-reply test, samples or physical records. This document changes no runtime and authorizes no deadline claim.

The present host broker sends only one active job. Consequently an entry cannot reach the Worker while its synchronous geometry job is running. The observed751–1003ms queue wait is not fixed by prioritizing already queued messages. Both broker arbitration and the geometry execution loop need an explicit suspended-job protocol.

## Existing indivisible costs

The shared candidate measures whole worker geometry calls737–990ms, not individual worker iterator steps. It cannot claim a worker step bound. The retained advanced controller instrumentation from16d measured `propsAt→Navigation.chunk→scatterWorld` at32.11ms; the earlier prototype had34.16ms maximum step. Native chunk scatter is one indivisible call. Boundary sorting, request navigation construction, input cloning/key construction and final complete-result freezing also execute between yields. These functions must be separately accounted for, not hidden inside a2ms target. The frozen control's host snapshot/packing and adoption cost also survives any Worker scheduling change.

## Proposed narrow protocol

Use the existing `computeRaidExteriorGeometrySteps` generator with its private request Navigation, preserving step ordering and final result. Drain at most128steps or a soft2ms CPU budget per Worker task, then return to the actual event loop using a scheduled task. This is a soft dispatch budget, not a hard execution bound: one step can exceed it. Measure actual per-step and per-slice durations and yields before choosing a different budget.

The Worker sends an owned identity-matched `geometry-suspended` acknowledgement at a genuine generator yield. Only then may the host broker send its queued entry while retaining the suspended geometry job. There remain at most one geometry continuation, one executing job and bounded queued replacement requests; no second Worker. Validate acknowledgement owner/job/token and never treat it as a completed graph. Cancellation closes the old generator and invalidates its scheduled task by identity; late acknowledgements/replies do not free or install newer jobs.

When an entry arrives, service it before the next geometry slice. After at most two entries, advance one geometry slice if still current to prevent starvation. Once started, the existing entry computation is itself synchronous and nonpreemptible; its duration remains a separate risk. Geometry completion resumes the existing full finite proof, internal complete-cache installation and host adoption. No partial regions, temporary graph or cache warmth are adopted.

If the required graph is not complete, the entry must use the existing native computation on its own request Navigation. That can repeat geometry work and is a measurable cost, not a reason to adopt partial data. If a complete matching graph is available, reuse it exactly as in the frozen control. Preserve default plain entry/geometry messages and shared job ownership; actual Worker scheduling is separate from simulation time, side selection, RNG and the raid deadline.

## Required tests and measurements before acceptance

Test entry arrival during a real suspended geometry job, cancellation/replacement/disposal at each phase, malformed/late acknowledgements, Worker error and unexpected exit, bounded fairness and all pending ownership. Prove no generator restart at anchor0, no live main-nav patch, full result order/key/radii parity and unchanged full physical spawn/RNG/route/reload/exits. Retain original exact-warmth failure; report any additional warmth change and host cache miss work rather than erasing equality checks.

Use the same retained advanced gzip and actual single Node worker adapter. Record per-step/slice CPU durations, entry receipt/start/wait/compute times, host packing/post/adoption and bytes proxies, both total completed jobs and duplicate geometry work. Do not add overlapping durations or infer frame delivery from Node CPU measurements. No App activation, simulation pause, calendar change, skipped raid, CI, GPU or campaign is included.

Even a successfully interruptible Worker does not prove the existing cold deadline is met: entry computation, snapshot cloning, postMessage, host adoption, cold chunk operations and fast camera/geometry invalidation remain. If scheduling cannot meet a deadline, retain that negative and keep the feature OFF.
