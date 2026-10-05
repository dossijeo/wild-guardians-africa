# Original MP3 windows and silent logical stems

Historical investigation before production integration. The current gameplay
route supports native 44.1 and 48 kHz; see
[native-rate validation](../music-window-44100/README.md). The measurements and
pending-work statements below describe this earlier candidate, not current status.

The candidate reads short MPEG frame windows from the original files; it does
not re-encode, concatenate media clocks, add new audio assets or change the
lab's mix. `tools/prepare_music_windows.mjs` indexes all twenty original files
into six-second usable windows, with 24 preceding frames to warm the decoder
and two trailing frames. Original sample rate, stereo, byte positions and
SHA-256 hashes are retained. Index generation uses ffprobe's packet walk;
estimated VBR container duration is deliberately not used.

`MusicWindowPool` decodes only requested windows, coalesces duplicate requests,
bounds simultaneous jobs to two, cancels obsolete queued/fetched work and
releases entries outside the retained set. A completed obsolete decode does
not repopulate the pool. `musicRangeReader` reads compressed byte windows from
the existing disk cache. If a compressed file is absent it is stored once;
denied/quota-limited storage falls back to HTTP ranges or transient slicing
when a server ignores ranges. Entire compressed files may be transiently
buffered by those browser/storage operations; entire PCM tracks are not
decoded by this candidate.

`MusicMixer` now tracks gain curves for stems with no allocated source. A
future positive-gain entrance is observable before its fade starts. Later
voices join at the correct logical level and inherit the remaining fade.
The existing lab recipes use eight nonzero stems for day/activity/night/
danger/attack, seven for spirit, five for A minimal and three for B minimal.
Skipping exact-zero stems preserves the mix. Limiting every scene to three
or four would change the supplied arrangements and has not been done.

Native WebAudio/IAB verification at 48 kHz:

- `mp3-frame-comparison.json`: 80 windows across all twenty stems, 7,680,000
  compared stereo samples, zero error and matching decoder lengths.
- `all-mp3-windows.json`: all 550 indexed windows, including all usable samples
  at every join, 315,993,600 compared stereo samples and **zero sample error**
  against full original decoding. Candidate range reads: 550 from disk, zero
  from network. The full reference is fetched/decoded separately for the
  diagnostic; this is not an entirely offline test page.
- The diagnostic retains one window at a time: maximum pool PCM ownership
  was 2,543,616 bytes. This excludes the full comparison reference, decoder
  transients and browser internals and is **not** a total browser RAM result.

Candidate pool/index/range and logical-voice tests cover silent stems,
prefetch, gain curves, retry, eviction, disposal, original-file identity,
continuous index coverage, cached/offline reads, storage denial and invalid
ranges/decoder output. Original mixer/evolution/transport tests still pass.

The pool is not yet connected to the production gameplay transport. Required
next steps: schedule consecutive windows against the shared WebAudio clock,
prefetch audible upcoming layers and registered branch targets, retain PCM
until its scheduled source ends, preserve all six original edge/crossfade/
preroll rules and test late/failed loads without shifting musical phase.
The sample-equivalence result currently covers **48 kHz only**. Resampling,
actual mobile memory/CPU, perceptual listening, itch.io storage and Windows
remain unverified. The current production gameplay still decodes whole packs;
this evidence does not claim its memory use has already fallen.
