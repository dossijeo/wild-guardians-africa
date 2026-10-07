# Committed payroll — SFX 115

`eco_spend` now accompanies a positive `HiringConfirmed.cost`, keeping the
existing confirmation sound. Initial hiring reports its already calculated and
settled cost, matching the existing proportional mid-day event. No wage, balance,
worker allocation, clock or command rule changes. Old saved events without cost
remain silent for this extra cue; restored histories are remembered, not replayed.

The cue uses the UI bus, economic-spend family and payroll emitter. A delayed
load must remain in the same audio generation, within 0.5 seconds and running
without a menu, hidden, context-lost or runtime-error pause. It never plays for
zero, negative, nonfinite or missing costs. Event-ID deduplication applies.

Twenty-six directed tests pass (`tests.tap`), including actual paid initial
hiring for 30 coins and additional young labour at simulated time150 for16,
each checked against the real ledger debit. Repeated processing, restored
history, empty contracts, duplicate commands, missing centers, insufficient
funds, suspension and stale audio guards are covered. Serialized simulation
before/after audio processing is exact.

Build and web-package verification pass (logs retained), with the existing
large-JavaScript-chunk warning. All126 distributed SFX and three metadata files
pass hash/export verification. Catalogue/code audit now reports96assigned and
30reserved. The original115 sound and its existing Opus bytes are unchanged;
only routing metadata and its distributed hashes change.

This proves domain/dispatch/package integration, not native playback or audible
mix quality. Browser navigation was unavailable during this change. Physical
mobile/Tauri listening and the remaining catalogue contexts are still pending.
