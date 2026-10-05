# Candidate transport with short native sources

`MusicWindowTransport` reuses the existing transport's section order,
registered-edge selection, jump cooldown/history, preroll, crossfade, protected
mixing interval and late-callback fallback. Logical deck/track gains remain
cheap and preserve the lab curves. Native sources carry only short audible
windows, use playback rate one and share the deck's WebAudio time origin.
Silent stems have no PCM; future entrances prefetch a window and schedule its
source from the correct global musical position. Completed native sources
release their references, and stopping music also disposes the window pool.

`window-transport-eight-cases.json` records eight native IAB runs with muted
output, original compressed files in the disk cache and a real 48 kHz
AudioContext. All six requested registered edges occur, and both packs wrap
once. Candidate window reads use zero network requests. Every recorded
scheduled-source offset agrees with its shared deck time origin (maximum
computed clock error zero). There are no music errors. Source counts include
future scheduled sources, not only sources already sounding.

Peak pool-owned PCM ranges from 72,400,896 to 81,395,712 bytes across the cases.
This includes retained playing, upcoming and splice-target windows. It is not
total browser RAM, decoder transients, GPU memory or a frametime measurement.
The original active whole-pack allocation was previously measured at roughly
547–659 MiB; the candidate's ownership is substantially smaller, but production
gameplay has not yet switched and must not be reported as already improved.

Seven additional transport tests cover six registered edges, both wraps,
shared source-position arithmetic, discarded silent stems, bounded retention,
disposal and a minimal three-stem B arrangement gaining future day layers.
The original full-buffer transport/mixer tests remain unchanged and pass.
The focused audio suite totals 117 passing tests; production build and the
585-file itch web package check pass.

Pending before production selection: rendered waveform comparison across
window seams and splices, difficult load/scene-change timing and recovery,
sample rates other than the validated 48 kHz, actual game integration with
shared load concurrency, perceptual listening and physical mobile validation.
This is a working transport candidate, not complete streaming acceptance.
