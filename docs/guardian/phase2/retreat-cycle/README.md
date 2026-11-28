# Hyena: impact, recovery and retreat

Native WorldScene/spatial-WASM, nighttime, continuous Game.tick. The fixture uses `retreatTrial=1` to start a wounded hyena with 28 resilience (one configured Attack damage). It does not change production balance or force the retreat state. One real cast exhausts resilience; the existing raid code selects retreat and pauses movement through stun/down/recovery.

Recorded `hyena-cycle.webm` contains VP8 video and 48 kHz stereo Opus, 12.97 seconds. The 12.03 simulation-second report has 283 visible frames, one maximum Guardian, no errors, no final down actors, zero remaining physical bodies. The animal reaches `gone` and the raid closes normally.

Observed phases: falling at 0.283 s; rolling at 2.340 s; recovering at 4.329 s; recovered retreat at 8.381 s; gone at 11.801 s. Logical retreat is selected immediately on the exhausted hit, but movement remains held. The actual hurt source starts at 0.250 s and retreat source at 8.348 s, after recovery. The contact sheet shows articulated fall, supine recovery, standing and running away; it is not a frame-by-frame anatomy certificate. Close tracking crops the Guardian during arrival and is diagnostic framing, not placement acceptance. Audio sources and encoded track are verified; subjective mix review remains open.

The first run revealed a fixture exception when the raid closed. The recorder now retains references to tested actors for terminal reports and refuses to label incomplete/error runs as validated captures. The successful repeat is the committed recording.

Frame p95 51.19 ms / max 200.03 ms; physics p95 5.23 / max 18.59 ms; Guardian animation p95 0.295 ms and VFX p95 1.34 ms. This recording includes capture and diagnostic support sampling; it is not a paired performance benchmark or a claim that whole-engine fluency is accepted.
