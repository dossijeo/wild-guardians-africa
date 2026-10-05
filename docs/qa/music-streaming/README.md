# Current gameplay integration

The tested 48 kHz gameplay route now uses short decoded MP3 windows; see
[production-windows.md](production-windows.md) for current selection, measured
scope and limitations. The experiments below retain their historical results.

## Compressed disk cache and media streaming

The production menu now uses the original MP3 through an HTML media element
connected to the existing WebAudio music bus. It preserves loop, pitch,
volume, suspension and disposal, without fetching and decoding the whole
track into an application AudioBuffer. A service worker stores the compressed
file in Cache Storage and serves media byte ranges using Blob slices. It
never stores PCM. First playback can pass through the network while caching
the complete compressed file; complete initial range responses are reused
without a second download. Missing or denied storage leaves normal media
streaming available. Cache persistence and eviction are browser-controlled;
this is not a promise that the entire game works offline.

Registration and asset paths follow the game subdirectory. Unsupported service
workers, including restricted iframe environments, fall back to media playback.
No third-party permission prompt or persistent-storage permission is requested.
Actual itch.io iframe, iOS and Windows media/cache behavior remain to verify.

Native IAB tests use `tests/browser/music-streaming.html`, the original assets
and a muted output bus. `menu-cache-only.json` shows the menu advancing beyond
34 seconds with zero AudioBuffers. Requests with `music-cache-only=1` are
served exclusively from the stored compressed file; an absent entry returns
503 rather than contacting the network. `ten-stems-a-cache-only.json` records
all ten original pack-A stems advancing beyond 55 seconds in that mode,
with zero application AudioBuffers, playback rate one and no playback errors.
The screenshot records the single-track menu case.

The ten-stem streaming experiment is **not enabled in production gameplay**.
Independent media clocks have small, variable spreads: the saved A/B natural
playback reports record maxima of about 2.67/5.14 ms, and the saved A/B seek
reports about 8.00/2.68 ms. An earlier unsaved A trial reached 13.36 ms.
These are observations of media `currentTime`, not waveform phase correlation
or perceptual listening. The prototype does not implement the lab's six
registered transitions, preroll, sample-accurate crossfades or scene mixing.
Those requirements need a shared-clock streaming solution, such as bounded
prefetch/decode of independently compressed segments, before replacement of
the existing gameplay transport. Disk caching and PCM windowing are separate
concerns; a disk cache alone does not reduce RAM in the current full-buffer
gameplay transport.

Gameplay loading meanwhile has a two-job queue across pack generations.
Obsolete queued tracks are not fetched, and stale fetched tracks are checked
before decoding. Already-running decodes cannot be cancelled. This avoids
unnecessary transitional work but does not eliminate the active pack's
previously measured 547–659 MiB PCM allocation.

Validation: 93 focused audio tests pass, including stale loads, pending media
play/disposal, rejection/retry, range/suffix handling, invalid ranges, cached
playback without network, original A/B transport and mixer behavior. Production
build and web package check pass. No mobile RAM measurement, frametime gain,
perceptual fidelity or complete streaming gameplay acceptance is claimed.

References: [WebAudio media streaming](https://www.w3.org/TR/webaudio-1.0/),
[media timing limitations](https://www.w3.org/TR/media-timed-events/).
