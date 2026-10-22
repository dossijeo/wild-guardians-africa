# Native Canyon warm floor

`visualLab=global-lighting&canyonFloor=warm` integrates the retained QA warm-floor palette into AfricanToon for mapped Canyon ground (resident and horizon materials). Newly streamed materials receive it through the normal material path. No runtime monkeypatch, binding map, disposal listeners or QA toggle uniform are required. Defaults, other biome materials and geometry are unchanged.

Authored warm indirect color preserves reference luminance. Weight uses existing ground shadow visibility, upward-facing normal and (1-night); it is not physical bounce lighting and does not tint vertical cliffs or night lighting deliberately. No new texture lookup, pass, triangles or texture allocation.

## Visual evidence

Capture/audit scripts: capture-canyon-warm-floor-native-20261022.mjs and audit-canyon-warm-floor-native-20261022.py under tools/experiments; corresponding -wide scripts cover long views. Vite 5190, seed 712, media 1280x720, day150/night350, visual time2, identical settled cameras.

24 screenshots / 12 QA/native pairs, 7 pixel-exact. Remaining 5 pairs differ by maximum 1/255 in a few color channels (largest mean channel difference .00000218). Same cameras, time, calls and triangles throughout. No browser/WebGL errors. Normal/wide day comparisons visually inspected. Standard view counters 39/35/32 calls and399675/348660/232389 triangles; wide23/29/49 calls and180915/223046/257533 triangles. Day/night counters equal.

Wide images retain the existing mottled plateau appearance because this parity run intentionally uses the same baseline material configuration in both arms. This is not evidence that the final Canyon art target is achieved. Optional canyonSandBlend=soft and adaptive horizon experiments remain separately validated candidates to combine later.

Four tests pass: `node --test tests/global-canyon-warm-floor.test.js tests/global-river-soil.test.js`. Gates, luminance, separate shader keys, mapped basic/standard materials, night/slope weighting and other-biome exclusion are covered.

## Cost

See ../canyon-warm-floor-native-cost-20261022. Reproduce with `node tools/experiments/measure-canyon-warm-floor-native-20261022.mjs` then `python tools/experiments/audit-canyon-warm-floor-native-cost-20261022.py`.

Intel UHD ANGLE D3D11, QA/native/QA/native, matched 4-unit looping camera path inside resident scene, paused simulation, 60warmup+90samples. GPU and cadence passes separate; no other tasks launched during sampling. 720 valid GPU queries, no invalid/disjoint/error samples. Per-frame camera/call/triangle sequences match.

|Phase|GPU QA1/native1 ms|GPU QA2/native2 ms|CPU QA1/native1 ms|CPU QA2/native2 ms|
|---|---:|---:|---:|---:|
|Day|10.234/9.930|9.838/9.862|3.779/3.737|3.874/3.846|
|Night|10.225/10.381|10.174/10.569|3.842/3.739|3.822/3.828|

Native-minus-QA GPU: day -.303/+.024ms; night +.156/+.395ms. No zero-cost or optimization claim: small night overhead measured in both repetitions, while full-frame cadence remains17.55-17.57ms. CPU differences -.103 to+.006ms. P95s/raw samples recorded. These short runs cannot isolate a compiler difference from hardware drift, and cadence is not uncapped FPS.

## Recommendation / limits

Retain native opt-in as the integration of approved art, with the measured night difference documented. Follow up when assembling the full Canyon preset. No texture/geometry reduction was used to hide cost. Other qualities, continuous streaming latency, long-running resource checks and final six-biome mockup comparison remain outstanding.
