# Gameplay window selection at validated 48 kHz

Production `AudioSystem.gameplay` now selects `MusicWindowTransport` for a
48 kHz context and a bank with authored section navigation. Other sample
rates retain the original full-buffer transport; their resampled window
seams have not been validated. The menu keeps its native media streaming.

The initial audible group is primed before starting the common musical
clock. A scene change while loading primes any additional audible layers.
Silent stems remain logical clock/gain entries. Only current, following
and imminent registered-destination windows are decoded. The original mix
usually has eight positive-gain stems, not three or four; minimal B has
three. The optimization does not remove the original instruments.

Original compressed MP3 files are stored in the existing Cache Storage disk
cache. Subsequent windows read compressed slices from it. A first uncached
track downloads its compressed file; unavailable storage uses HTTP ranges.
No MP3 re-encoding or whole-track PCM is used on this selected route.
The decoder shares the same two-job queue across pack replacements; stale
queued windows are skipped and disposed pools cannot retain late results.

`window-waveform-scenes.json` records sixteen native stereo OfflineAudioContext
comparisons at 48 kHz: s1/s9 in both packs, minimal-to-day entrance, day-to-minimal
and return, success and failure including restoration. Each renders thirty
seconds from a fractional offset. All 46,080,000 compared sample values are
identical (maximum error zero). This diagnostic awaits loads at planning
steps and does not measure live loading latency or perceptual listening.

Two controlled delayed-read regressions verify that an initially silent layer
joins the current clock, and that a missed window deadline skips expired
audio and recovers in phase with bounded PCM. A deadline miss can cause an
audible gap; the tests do not promise uninterrupted playback under arbitrarily
slow storage/network. Five integration regressions cover production selection,
scene changes during startup, pack replacement and shared concurrency,
leaving/suspending during decode, and the unvalidated-rate compatibility path.
127 focused audio tests, production build and the relative web package check
pass including the wrap-offset regression. Physical mobile listening/RAM,
itch-hosted cache behavior, other sample
rates and complete campaign audio acceptance remain pending.

The earlier candidate reports remain historical evidence. An initial production
eight-case run is retained in `window-production-before-final-tick.json`: it
observed six jumps and A's wrap, but B did not complete its wrap. The initial
late-callback hypothesis was disproved by the second retained report,
`window-production-final-tick-investigation.json`. An isolated B wrap did
complete, demonstrating timing sensitivity rather than a universal failure.

Recording transient errors and transport replacements found the actual cause
in `window-production-negative-offset.json`: cancellation at a wrap could
produce offsets -7.10543e-15 / -1.24345e-14 seconds. Native `start()` rejects any
negative value; automatic recovery hid those errors in the previous final
snapshots and restarted B twice. The candidate now clamps the source offset
to its first valid sample at zero. The reference transport remains unchanged.
A regression deliberately rounds a deck start infinitesimally backward and
verifies nonnegative native offsets. The diagnostic records transient errors,
restarts and initial/current deck clock data and consumes the real clock
before its terminal capture.

The corrected real-time production run, `window-production-eight-cases.json`,
passes all six requested registered jumps and both wraps. Every case records
zero transient errors and zero transport restarts. Original compressed-window
reads use zero network requests, exercising the existing disk cache. Peak
pool-owned PCM is 81,395,712 bytes (77.625 MiB), including playing, upcoming and
splice-target windows. This is not total browser RAM, decoder transients,
frame time or physical-mobile evidence. Final waveform rechecks are retained
as `window-waveform-production-seams.json` (twenty cases, 23,040,000 values,
maximum difference 9.094947017729282e-13) and
`window-waveform-production-scenes.json` (sixteen cases, 46,080,000 values,
maximum difference zero). No sample exceeds the unchanged 1e-7 threshold.

The native-world dawn diagnostic now reports window ownership rather than
assuming every loaded descriptor has a full-track buffer. Its fresh execution
is still pending; the older full-buffer world report retains its original
scope. The original PCM diagnostic explicitly selects the reference route,
and the mixer diagnostic reads gains by logical track ID instead of assuming
one source per stem in array order.
