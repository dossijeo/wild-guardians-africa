# Bounded optional music cache preparation

On source `87bea94e`, menu playback awaits `prepareMusicDiskCache()`. The existing
three-second deadline only starts after service-worker registration and `ready`
resolve. Either earlier promise can remain pending, indefinitely preventing the
ordinary streaming music from starting even though caching is optional.

The deadline now covers registration, activation and controller acquisition
together. Success, denial and timeout remove the timer and controller listener.
Late registration/activation results cannot attach listeners or change the
settled result; late rejection is handled. The shared initialization promise,
compressed disk cache and normal media streaming fallback are preserved. No
service worker is unregistered, and no PCM decoding is introduced.

The two regression cases fail against the old source (no registration deadline,
and unresolved activation). Six directed preparation tests cover those cases,
controller success/timeout, shared callers, late rejection and unsupported
security context. The final preparation/cache/range/stream/audio-lifecycle suite
passes 44 tests. The earlier 61-test run additionally covered window transport,
including long branching/wrapping playback; it preceded the additional late
rejection test, with identical runtime implementation.

Production build passes in 10.31 seconds. Audio runtime verification checks 21
music files, two indexes and 550 windows with valid hashes; SFX inventory remains
fresh at 126 entries. These are automated lifecycle and asset checks, not
physical audible acceptance, a reproduced browser service-worker stall, or a
resolution of the independent Windows world-loading regression.
