# Readiness at 88%: observational proposal

Original normal Windows run 37983985482 / source 8e1909d8 failed its unchanged 90-second world-ready gate. The original 3,132-byte report is preserved byte-for-byte with SHA256 in receipt.json. At finish: worldWaitMs 90034.9, readyGateReached false, visible/focused, canvas 1028×720, displayed 88 and “Bringing your world to life...”. No pending phase or renderer identity was reported. Earlier normal fc66151f reported 83 / “Preparing rendering resources”; those texts do not establish a changed cause or a speed improvement.

## What the source establishes

LoadingProgress blends weighted work with observed downloads. The percentage alone cannot name a gate. LoadingCopy maps gpu and visible-ready to the same life text (as well as buildings/crops/walls/vfx). After 15 seconds without changed progress, LoadingOverlay instead shows the first pending milestone's wait message. Thus the life label does not prove that World.load has returned or that actor preparation is pending.

World.load awaits actors before warm GPU and far assets. After World.load, main also awaits extra villages, prepareInitialFarWorld, freezeForCinematic, cinematic.prepare, plant maturity and cinematic.finished. prepareInitialFarWorld requires every actual adapter.layer.current, not merely an empty actor queue. freezeForCinematic waits for the orbit to settle. Cinematic preparation renders both required views through the existing renderer, then verified-ready requires every milestone/transfer and mature loading plants. These conditions remain unchanged.

## Draft helper and minimal wiring for review

The new loading-readiness-snapshot.js is deliberately UNIMPORTED. Seven CPU contracts pass; no production path, build, GPU or dispatch has changed. Its report contains at most 16 milestone rows, 8 adapter rows, 16 active spans and one last-completed span, with omissions explicit. It copies only scalars. It does not call queue.run/whenReady/request/update, shader isReady, compile, render, fences, GL queries or a new RAF/timer. Plants.mature and orbit.settled are existing read-only getters; the former examines the existing bounded plant list. Actor/chunk/far counts describe logical queues, not GPU completion, physical memory or exhaustive future work.

Proposed integration, subject to root review:

1. Only while the original product smoke is active, compose the existing optional world.onLoadingSpan witness with the bounded tracker. Preserve any prior callback's this, arguments, return and exception exactly once. Its awaited wall spans include nested/concurrent waits; never sum them as exclusive CPU/GPU time.
2. Give existing app-tail awaits labels: app-extra-villages, app-initial-far-ready, app-orbit-settle, app-cinematic-prepare, app-plants-mature and app-cinematic-finished. Use the existing optional witness helper; outside smoke the null witness retains the exact ordinary call path. No new work or altered deadlines. Diagnostic Promise/timestamp overhead must be disclosed.
3. Expose one smoke-only owned snapshot callable after successful World construction. Establish WeakRef before mutation; no unavailable-WeakRef fallback retaining World. On abort/disposal remove only this owner's callable and restore the previous span callback only if still this owner's wrapper. Add explicit constructor-failure, cancel, replacement and throw contracts before activating wiring. Include current lexical presentation owner only for the immediate snapshot; do not retain removed objects in reports or providers.
4. Original smoke finish invokes the callable once before teardown and stores the bounded readiness snapshot. Read renderer.getContext() only on this already-owned live World (never canvas.getContext()). One-time vendor/renderer/version/unmasked identity parameter reads are diagnostic overhead, not a cause. Skip dead/aborted World; driver faults produce unavailable. No shader completion polling and no new GL query objects.

This identifies an active awaited label plus actual logical readiness predicates at the unchanged failure boundary. It cannot by itself distinguish GPU link work, driver scheduling, event delivery or physical transport. A new recipe is not justified until that boundary is observed.

No build/dispatch/GPU/promotion is authorized in this proposal. Original water/lava coverage-depth production extraction remains separate from historical shared-ground/prefetch/pause experiments; those are not re-enabled by this helper.
