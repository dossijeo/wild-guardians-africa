# Fine-noise volume experiment

This QA-only candidate replaces the two pigment noise evaluations and the
fallback ground's fine evaluation with an R8 64-cubed texture (262144 source
bytes). Hardware trilinear interpolation retains the authored smooth curve.
Coarse ground noise, cel bands, palettes, lighting, normals and shadows remain
unchanged. The field is quantized and periodic: it is not pixel-identical to
the analytic field. Production does not import this adapter or texture.

The public `african-toon.html` fixture has a volume toggle and paired ABBA mode.
Each run warms thirty frames and measures 180 frames, ninety per path, using
asynchronous GPU elapsed queries. Both paths use the same shader program and
live uniforms, avoiding recompilation between samples. The initial exploratory
run moved its camera through the fake raid director and was discarded. The
fixture now treats its prepared actors as a manual camera inspection and reports
whether all measured camera poses remain stable. Production raid centering is
unchanged.

| Native QA scene | Analytic mean GPU | Volume mean GPU | Difference |
| --- | ---: | ---: | ---: |
| Savanna workers and five beasts | 22.192 ms | 21.740 ms | -0.452 ms (-2.04%) |
| Canyon village and ground | 18.293 ms | 18.150 ms | -0.143 ms (-0.78%) |
| Desert village and ground | 19.698 ms | 19.474 ms | -0.224 ms (-1.14%) |

All three runs use Mapungubwe, seed712, medium quality, shadows, a 1280x720
viewport and 1600x900 rendering on Intel UHD/ANGLE D3D11. Their cameras are stable,
domain snapshots unchanged, and calls/triangles identical for both noise modes
in each run. All 180 GPU queries resolve, without disjoint events or errors.
CPU and browser frame cadence remain in the raw reports and are not presented
as equivalent to GPU time or mobile performance.

The small mean differences do not establish a useful universal improvement:
canyon median GPU time is effectively unchanged, and desert p95 is slightly
higher with the volume. This candidate is therefore **not adopted in gameplay**.
More biomes, cultures, destruction, distance/periodicity and physical mobile GPU
coverage would be required before promotion. The original shader remains the
default.

Screenshots from the static actor camera retain outlines, poses and broad
color appearance. In the recorded 742400-pixel world region, the mean maximum
RGB channel difference is 0.109/255, maximum17/255, with303 pixels exceeding8/255.
This quantifies one comparison and does not certify every material or viewpoint.
The ground/canyon pair is also retained for visual inspection.

Four focused source/volume checks pass: deterministic unbiased R8 data,
idempotent disposal, original analytic fallback, preservation of coarse noise
and rejection of an unsupported source recipe. The prototype and the camera
measurement correction are reviewable separately from any gameplay change.
