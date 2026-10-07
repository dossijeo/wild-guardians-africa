# SFX 114 — committed wall refund

`eco_gain` now accompanies a `WallRemoved` event only when its committed refund
is finite and positive. The existing demolition sound remains the physical
action cue. Crop deliveries retain `eco_crop_sold`, without this income cue.
There is no new payment, economic mutation, RNG use or domain event.

The refund uses the UI bus and a dedicated economic-refund family/emitter.
Normal event-ID consumption prevents replay on repeated processing or shifted
history; remembering restored events prevents replay after continuing a save.
Pending decoding expires after 0.5 seconds, on audio disposal/generation change,
or menu/hidden/context-loss/runtime-error pause. Invalid and zero refunds do
not cue income.

31 directed tests pass: paid intact and damaged wall removal, exact refund
ledger delta, domain immutability during audio processing, history restoration,
invalid amounts, crop-sale separation, late cancellation, wall construction,
full routing/126 original byte identities and event history. Production build
passes with the existing size warning; all 126 runtime Opus assets verify.
The rebuilt web-package check passes: 641 files, 859 relative links and 20
runtime GLBs, without original-model or superseded-ground duplicates.
The regenerated catalogue contains 95 assigned and 31 reserved entries.

This is code/domain/runtime-asset verification. Native audible mix and physical
mobile playback remain pending; no rendered/audio acceptance is claimed here.
