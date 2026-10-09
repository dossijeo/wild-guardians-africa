# Worker-disabled entry preparation — design for review, not implemented

Frozen runtime remains ad0cdb3a; protocol/transport93d108e7. Browser worker failure currently disables preparation. The bounded synchronous entry attempt can return pending, and unchanged inputs do not repeat the attempt. This is safe but **not eventual playable progress**, so no campaign/production approval follows. This document proposes a real continuation, not an async wrapper around synchronous packing.

## Driver and ownership

RaidEntryPreparer should retain its existing single render-loop driver. When worker creation/error/exit disables the worker, select a cooperative executor whose step method advances a private native entry-search continuation. Call it from the existing update/render preparation path, outside Game.tick. No second renderer, animation loop or autonomous game clock. A Node QA driver must yield to normal event-loop turns and call the same executor explicitly, recording wait time separately.

The continuation owns entry-relevant request data, private preview actor/target state, iterator stack, candidate indices, native routes and work counters. It never inserts actors into s.raid, spends coins, completes tasks, changes HP or changes the chosen group/strike budgets. The real spawn remains the only preferred-side/hit-budget RNG consumer. A private unselected request may predict its side from a copied RNG as the worker does today; its key becomes obsolete if the real first attempt persists a selected side. No reroll or silent compatibility relaxation: restart from the selected key. A save includes the already persisted plan/group/side but no opaque iterator; restoration rebuilds preparation under the current geometry and consumes no additional RNG.

## Native stepped search, not repeated capped attempts

Refactor a separately reviewable generator entry API: the existing ordered anchors/candidate lattice, per-radius actual reachableApproach alternatives, per-body native connectors and escape checks must become resumable loops. Yield at deterministic geometry-call boundaries and between native findPathSteps batches. Store completed results and loop indices; do not restart from anchor0 every frame. Never convert an interrupted path to null, cache it as failure, or move to a different candidate as though non-transitability were proved.

The cache-aware path continuation must check native failed/prepared/successful queries before starting A*. Retain the original route endpoints/radius/ignore/worker/margin key and native ordering. Complete native route failure may be cached; paused work may not. Completed native geometry/cache facts can survive slices only within their matching navigation epoch. Do not hold withNavigationQueries' synchronous WeakMap scope across render frames: use a private bounded route store for the request and publish only fully validated warmth on adoption.

findPathSteps already yields every eight visited nodes, but its caller/path wrapper currently consumes synchronously. A cooperative path adapter must drive that iterator a bounded number of next calls, preserving pending state instead of returning a false route failure. Initial endpoint checks, portal/region setup and native geometry calls before the first A* yield also need boundaries at the entry/approach layer. A single native geometry call may generate/cache terrain props and itself exceed a desired frame budget; a call counter does not prove a millisecond limit. Measure this cold/warm cost and identify any indivisible work before claiming stable frame delivery.

## Descriptors, invalidation and cancellation

Prefer a private navigation facade with request-local state/cache ownership. Never leave patched live Navigation methods installed across a yield. If any temporary native method wrapper is necessary, restore exact own/prototype property descriptors in a synchronous finally before returning a slice. No renderer/game system may observe a budget wrapper or partial iterator.

Before each resume/adoption, compare the same raidEntryKey plus entry-relevant current nav/bounds/camera/structure geometry. On invalidation call return() on every nested native generator, release request-local buffers, discard partial layouts/warmth and reset counters for the new key; do not change game group/side. Dispose, menu exit, state replacement, completed raid and terminal result close continuations once. Aborts are recorded as superseded/cancelled, not geometry failure. Unexpected errors are actionable and leave no active iterator; no silent timeout/restart used as proof of success.

All accepted bodies retain actual footprints and radius-sum+1 m placement clearance. Every actor must have a native connection to a legal current attack approach (or the plan's legitimate no-target retreat behavior), not a generic worker route or centre delivery point. Keep full-group reversible escape/native actor-clear checks. A final bounded revalidation is necessary for dynamic blockers/geometry changes; if it cannot finish in one slice, it too must be a continuation under a coherent snapshot. Target reservations remain exclusive; no partial-group spawn and no fake walkability.

## Clock and failure contract

Before600 native simulation may progress normally while preparation runs. At600 with pending unspawned night entry, Game.tick/advanceReal retain their reviewed freeze of elapsed/cooldowns/spells/collapses/gates/workers/ledger/calendar/victory; UI/camera/executor update remain usable. Cooperatively waiting does not grant free growth or paid work. Only a matching complete result permits the ordinary spawn and clock to resume. Camera/bounds changes can invalidate/resume under a newly legal request.

Finite all-candidate exhaustion is an explicit no-entry diagnostic, not a fabricated defeat, skipped night or completed campaign. Valid native farms must not permanently stall. Current worker geometry/search limits and centre-anchor choice may fail other real layouts; those are failed gates requiring native alternative approaches, not justification to relax collisions or omit animals. General native-farm coverage must be demonstrated before production acceptance.

## Required focused tests before implementation can be accepted

- Cached/prepared allowance0 parity; completed-failure cache parity; interrupted generator does not poison failed/closed-region caches.
- Many slices of one unchanged request advance beyond the first candidate, then converge to the same native complete result as the reviewed worker with unchanged group/side/RNG.
- Descriptor identity restored after every slice, error, key change and disposal; no command/state/ledger mutation during preparation.
- Camera, bounds, geometry, selected-side and state replacement invalidate all partial results; serialize/restore keeps persisted side and clears opaque continuation.
- Nested approach/A*/packing/escape interruption resumes correctly; no false route-null, invisible actor or partial spawn.
- Worker-disabled valid farms in all six biomes eventually enter and physically retire; impossible synthetic bounds remain explicit pending diagnostics.
- Pending600 and final-night100 clocks freeze honestly; fresh complete result resumes without duplicate RNG/actors/night transition.
- Cold/warm per-slice timings and longest frames measured independently; work-unit limits alone are insufficient performance claims.

Implementation affects native route API/packing/preparer ownership and requires root review first. No runtime fallback change, producer, campaign, GPU benchmark or promotion is included here.
