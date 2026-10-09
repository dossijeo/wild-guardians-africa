# Owned loading waits and private fallback — native acceptance scopes

Frozen feature source `4631392e` (runtime `0a48a269`). Cases 82–85 ran sequentially; each renderer was disposed, context loss verified and tab closed before the next. Final selected browser inventory was empty. These resource-probed runs are **not frametime acceptance measurements**.

## Isolated native compilation (82)

Native screen recipe, real selected-program readiness and real fence passed. Owner cancellation and deadline controls deliberately held a cached native program's readiness false; screen target, viewport, scissor and scissorTest were restored while waiting, and zero late readiness queries occurred after exit. Rendering remained functional afterward. Actual `WEBGL_lose_context` loss rejected pending preparation, with no subsequent stale query.

The final redundant `forceContextLoss` call after deliberate loss emitted one Three warning that the extension was unavailable. This warning is retained in the JSON; it is not a test of unsupported context loss (the preceding native loss passed). Restoration between polls has unit event/epoch coverage, not physical-browser restoration coverage here.

## New Game and dense Continue resources (83–84)

| Scope | New Game | Dense Continue, night |
|---|---:|---:|
| Requested-buffer peak | 68,472,406 B | 94,956,936 B |
| Requested buffers at controls ready | 62,242,476 B | 88,729,054 B |
| Requested buffers after shutdown | 0 B | 0 B |
| Texture objects remaining after explicit disposal, before implicit loss release | 5 | 5 |

Previously the private diorama shadow fallback left six explicit texture objects at shutdown. The correction now leaves the common five dummy renderer stores in both cases; their 1-pixel definitions are recorded. The dense case retains its existing shared native maize texture stores through handoff. The sampled requested-buffer peak and final totals equal the earlier dense ownership run. The new-game peak differs by 89,880 bytes; there is no overall memory improvement claim.

Dense archive hash `b485768f1cc172c5b174138f2c678e2bfa2d0b544d5316a3e9cb3dddf33f9103`, day 101, 23,894 historical plants and 36 workers. QA overrides time to 310 seconds before restoring the baseline state; logical state, restoration and final intended camera comparisons pass against that baseline. New Game checks also pass, and both cases report errors empty.

`performance.memory` stage samples are nonstandard JS-heap estimates, not total RAM, and not continuous peaks. GL requested buffers/textures exclude physical driver allocations, compilation caches, worker memory and native image storage. Neither total RAM/VRAM neutrality nor smoothness is approved by these probes. Wider final-source matrix/performance/cancel/lifecycle gates remain open.

## Cancellation during initialization (85)

The player cancellation button was used while world assets were pending at the renderer stage. Loading returned `done/cancelled`, with the expected world-cancel diagnostic. Requested buffers and texture objects after disposal were zero, context was lost, and errors/late console errors were empty. This is one actual pending-world cancellation, in addition to never-resolving-loader unit contracts; it does not cover every loading stage or browser lifecycle.
