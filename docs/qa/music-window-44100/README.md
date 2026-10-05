# Native 44.1 kHz music windows

Gameplay now uses the audible-window transport at 44.1 kHz as well as 48 kHz.
Silent stems retain only their logical clock and gain curve. The original MP3
files remain unchanged and compressed files retain the existing disk cache.
Other context rates still use the original full-PCM compatibility route until
their scheduling and resampling have been verified.

The first experiment played independently decoded 48 kHz windows into a 44.1 kHz
context. It did not preserve the reference waveform: twenty representative
fractional starts, registered jumps and wraps reached maximum error 0.002357.
`44100-initial.json` is retained as rejected evidence, not relabelled as a pass.

The accepted approach decodes directly at the native context rate. MP3 range
origins must align to whole samples in both clocks. Each MP3 frame contains
1,152 source samples; five frames correspond to exactly 5,292 samples at
44.1 kHz. Moving preroll from 24 to 25 frames aligns all six-second windows.
The index declares the two supported rates and the pool rejects unsupported
rates or misaligned origins. Source-rate decoder lengths remain exact.

Native resampling can return one sample below the nominal integer output
length, as the retained `44100-aligned-length-error.json` records for the final
window. The pool accepts this bounded rounding at a supported resampled rate.
The aligned origin and musical timestamps never move. The full-window comparison
checks coverage against the original decoder output, including original endings.
Scheduling uses the output context's sample grid; MP3 positions use source-index
seconds. Independent source/clock rates do not reset silent-layer positions.

Native comparisons with the updated index:

| Check | Coverage | Maximum absolute sample error |
| --- | --- | ---: |
| Every window at 48 kHz | 550 windows, 20 tracks, 315,993,600 stereo values | 0 |
| Every window at 44.1 kHz | 550 windows, 20 tracks, 290,319,080 stereo values | 1.1920929e-7 |
| Rendered 44.1 kHz transport | 20 cases, four representative stems across both packs; fractional start, six registered edges, two wraps | 2.2351742e-8 |

The comparison reference decodes full tracks solely in the diagnostic page.
Candidate byte-range reads are from the compressed disk cache. Thus these full
comparison pages are not total-RAM or entirely offline application measurements.
The small nonzero 44.1 kHz differences are recorded, not described as bit identity.

`live-44100.json/png` exercise the production AudioSystem in a native real-time
44.1 kHz AudioContext. All eight registered-edge/wrap cases pass. Every case uses
MusicWindowTransport, has zero errors, zero restarts and zero candidate audio
network reads. Maximum logical clock error is 2.8421709e-14 seconds. Peak owned
window PCM is 75,053,056 bytes (71.58 MiB); this excludes browser/decoder internals
and is not total RAM. Output is muted, so this is not a perceptual listening test.

Initial real-time attempts loaded an old Vite transform containing the previous
48 kHz-only guard. Their errors are retained in `live-44100-initial-error.json`
and `live-44100-source-diagnostic.json`. Rewriting the unchanged source bytes
invalidated that transform; the served current guard and the successful native
route were then checked. Those failed attempts do not constitute gameplay passes.

The preroll adds 24 ms of encoded audio per noninitial window, compared with the
previous index. Decoding remains asynchronous through the shared two-job queue.
No extra renderer work is introduced. Actual CPU/mobile frame-time impact and
total device memory remain unmeasured; no performance percentage is claimed.

341 audio/music tests pass, including source-file identity, silent stems,
native-rate selection, index alignment, bounded resampler rounding, malformed
outputs, cache fallback, gain curves, eviction and disposal. Build and web package
validation pass: 586 files, 407,001,020 bytes, 839 relative links, 20 runtime GLBs.
`provenance.json` stores source fingerprints and test-log hashes. The separate
1,883-test full-suite result applies to the preceding raid-navigation baseline,
not this new audio change. New CI, physical phones, perceptual listening,
itch.io storage behavior and other context rates remain separate acceptance work.

Reproduce:

```
node tools/prepare_music_windows.mjs
node --test tests/music-window-gameplay.test.js tests/music-window-pool.test.js tests/music-window-index.test.js tests/music-window-transport.test.js
```

Native pages:

- `tests/browser/music-frame-probe.html?rate=44100`: compare all windows.
- `tests/browser/music-frame-probe.html?rate=48000`: source-rate regression.
- `tests/browser/music-window-resampling.html`: rendered reference comparison.
- `tests/browser/music-window-transport.html?rate=44100`: eight real-time cases.
