# Native rendered-waveform comparison

The initial candidate's source-position arithmetic and eight real-time cases
passed, but rendered signal comparison found a fractional-sample seam issue.
`window-waveform-before-alignment.json` preserves that result, including the
large differences; it was not removed or reclassified as a pass.

Short sources now start on explicit native sample boundaries, with their read
offset compensated to preserve the continuous original musical position.
Internal window ends use the same boundary rule. The immediate logical track
gain is also initialized like the original `startBuffer`, instead of leaving
the GainNode default of one until a future automation event. The intermediate
reports retain the experiments that isolated the remaining one-frame gain
difference. An attempted initially-silent deck changed that frame compared
with the original and was discarded. **The full-buffer reference transport,
lab cues, gains and waveforms were not changed to obtain agreement.**

`tests/browser/music-window-waveform.html` uses real stereo OfflineAudioContext
rendering at 48 kHz. It plans both transports against the same controlled
clock and defers graph disconnection until rendering, so simulated cleanup
does not erase sound scheduled in the past. It does not measure live loading
latency: candidate prefetch is awaited at each planning step. Reference MP3s
are decoded completely solely for this diagnostic.

The final `window-waveform-aligned.json` covers twenty twelve-second stereo
comparisons: s2 and s9 in each A/B pack, all six registered edges, both wraps
and natural playback from fractional offset 29.91327. Total: 23,040,000
sample values. Maximum absolute difference is 9.094947017729282e-13; zero
samples differ above the unchanged 1e-7 diagnostic threshold. Histories and
nonzero reference signal RMS are recorded per case. Original full-track
samples and all 550 decoded windows were separately compared previously.

This proves the tested seams and fades, not every arrangement or device.
Physical-mobile listening, other sample rates, rendered scene changes and
result envelopes, difficult load timing, and production selection remain
pending. Production gameplay still uses the full-buffer transport.
