# Late impact audio cancellation

A GuardianMagicHit dispatched to the audio loader previously checked only generation, pause, context state and a 0.5-second deadline. It could still begin playing after its animal disappeared while the clip was decoding.

Both the species hurt vocalization and the quiet contact layer now additionally require the same simulation state, an unfinished game, an existing non-gone target and a clock at or after the contact marker. The shared audio playback path checks this predicate after decoding and before starting the source. Existing active sounds are not forcibly cut by this change.

Regression reproduced before the fix (removed-target assertion failed), then all five invalidation cases passed: removed target, gone target, result, rewind and replacement world. The combined impact/animal audio suite passes 29 tests, including species-specific routes, distance attenuation, delayed impact markers and retreat only after knockdown/get-up. These are automated audio-state tests; they do not constitute a new graphical or listening review of a raid.
