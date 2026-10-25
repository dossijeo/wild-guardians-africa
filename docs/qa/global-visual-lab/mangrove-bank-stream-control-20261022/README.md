# Mangrove streaming: native control and warm daytime repeat

Reproduce `node tools/experiments/capture-mangrove-bank-stream-control-20261022.mjs`, Vite5190. Two daytime 96-unit round trips per arm: native original and owned/gated shoreline candidate. Seed712/media/1280x720, fixed simulation/wind, settled stops. Twenty real frames; no captured errors.

| Arm | Trip | Changed return pixels | Max channel delta | Mean RGBA delta (0-255) |
|---|---|---:|---:|---:|
| Native | First | 197889 |119|1.764173|
| Candidate | First |195714|128|1.712845|
| Native | Second |0|0|0|
| Candidate | Second |0|0|0|

Candidate maintains25 live shore textures at every stop on both loops, native has none. First-trip native comparison was visually inspected; the broad small differences are not evidence of a candidate-only material error. Exact root cause is still unisolated; do not assert a particular cache or shadow bug. Both arms' exact second-day return removes night/warmth confounding. This does not demonstrate rapid-motion continuity or every seed, nor does it prove the candidate contributes zero first-trip difference.

Decision: native-control/warm-repeat gate passes for the tested fixture; preserve original first-trip issue as a general renderer limitation. The retained shore candidate can progress toward explicit opt-in native integration with its measured cost and no global defaults change. Global six-biome artistic goal remains incomplete.
