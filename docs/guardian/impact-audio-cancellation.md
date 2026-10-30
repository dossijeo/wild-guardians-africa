# Late impact audio cancellation

A GuardianMagicHit dispatched to the audio loader previously checked only generation, pause, context state and a 0.5-second deadline. It could still begin playing after its animal disappeared while the clip was decoding.

Both the species hurt vocalization and the quiet contact layer now additionally require the same simulation state, an unfinished game, an existing non-gone target and a clock at or after the contact marker. The shared audio playback path checks this predicate after decoding and before starting the source. Existing active sounds are not forcibly cut by this change.

Regression reproduced before the fix (removed-target assertion failed), then all five invalidation cases passed: removed target, gone target, result, rewind and replacement world. The combined impact/animal audio suite passes 29 tests, including species-specific routes, distance attenuation, delayed impact markers and retreat only after knockdown/get-up. These are automated audio-state tests; they do not constitute a new graphical or listening review of a raid.


## Priority admission correction

The bank-routing `sound()` method overwrote an explicitly requested priority with the identifier default. Guardian hurt/contact events requested priority 2 but reached voice admission at priority 1. A new test saturates one beast's two emitter slots with lower-priority sounds, then dispatches a real GuardianMagicHit through bank lookup and source creation. Before the fix its hurt vocalization was rejected; after the fix it replaces one lower-priority voice and still respects the two-voice limit. Explicit priority now survives routing, with the identifier priority retained as the default. Combined bus/combat/animal suite: 53/53 pass, build passes.

The omitted appearance in the night trace is consistent with the Guardian emitter's two occupied slots (1.6 s appearance and 2 s activation) at the second cast one second later. Its priority remains lower than the launch; no limits were raised and no new audio asset was added. That trace alone does not conclusively identify the admission branch. A new listening review after the priority change remains pending.
