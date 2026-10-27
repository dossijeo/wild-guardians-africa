# Articulated tail recovery iteration

The recovery pose now distributes tail clearance across Tail_01 through Tail_05
when present, instead of applying the entire rotation at the base. Distal joints
fold and release with progressively delayed smooth envelopes. All five captured
local poses are restored exactly by the existing secondary-pose restoration.
No additional physics bodies, textures, geometry or runtime dependencies.

The 14 ragdoll tests and 19 combat/baked/expression tests passed. The lion's
brace diagnostic still measures approximately 0.0137 m wrist-target error;
terrain contact samples remain enabled. The actual candidate-lion lateral
Attack cycle completed with no errors and zero residual bodies. Runtime JSON
and MP4 are included. Audio remained disabled; this is not a performance A/B.

Inspected the contact sheet extracted with input seeking (`ffmpeg -ss 4 -i …`)
at 4 fps: the tail transitions from a raised position to its hanging pose
without an evident discontinuity in these samples. The visual difference is
modest and does not by itself establish final artistic quality. The stance,
hands and species-specific motion still need review. This test uses the lion
candidate, which is not installed in the production catalogue.

Extraction note: input seeking must precede `-i` when selecting a short interval
for a tiled contact sheet. Output seeking after `-i` can select already tiled
frames, yielding a different interval than intended. The complete videos remain
the authoritative chronological evidence; earlier sheets include broader fall
and resumed-AI frames and should not be interpreted as exact phase timestamps.
