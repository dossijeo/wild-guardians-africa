# Perceptual review surface for Gameplay A/B

`tests/browser/music-evolution.html` now starts silent and exposes an explicit
**Activar escucha (25 %)** toggle. It changes only the WebAudio master music
gain: the original A/B stems, transport, sixteen-bar evolution, quantization,
success/failure arrangements, playback rate and game rules remain unchanged.
Muting again leaves the transport running, so a reviewer can compare at the
same musical point without restarting the stems. The page disposes audio on
exit and has a **Parar** control.

With the Vite development server running, open
`/tests/browser/music-evolution.html`. Select A or B, enable listening, allow
an automatic evolution at the original sixteen-bar cadence, and try both
Éxito and Fracaso. Review abruptness, stem balance, transitions, repetition
and whether the two packs remain distinct. Headphones or a known speaker
level are recommended; the browser may require the first button click to
unlock audio.

The browser smoke check on the current branch observed silence at load,
`outputGain` changing to 0.25 and back to 0 without stopping the sources,
pack A then B, an automatic B evolution (`lastAuto: s1`), playback rates all
1, no reported errors and zero music voices after **Parar**. The separate
paid native 3D test completed a workday, harvest, delivery, raid, dawn and
A→B swap with old-pack eviction, wind preserved, zero browser errors and a
closed audio context. That test is intentionally muted and already existed;
it is technical integration evidence, not a new listening verdict.

QA-156 remains **partial** until someone actually listens to the candidate
transitions and judges them on target playback hardware. This review page
does not establish phone memory, speaker loudness, or a full-campaign music
experience.
