# Canyon multidirectional slope diagnostic

Decision: **do not promote**. Replacing the slope tile breaks some nearby reflection patches but does not remove the conspicuous distant bands. It does not provide the requested natural-water improvement. Current production water, banks and palette remain unchanged.

## Controlled experiment

Source 331bc3ff1. Native full-background Canyon recipe plus canyonBank=balanced; seed712, medium,1280x720, three camera poses/day150/night350. Early QA pause prevents loading-time simulation drift. Baseline and candidate each include warm-up and final captures (24 total). Six final pairs match camera, target, origin, time, calls, triangles and geometry/texture residency exactly; no captured JS/shader/GL errors. These historical QA poses are useful for isolating water but are not the populated native gameplay-camera acceptance gate.

Candidate replaces only the shared slope texture data. Twenty-four integer Fourier modes with varied orientations generate a periodic continuous slope field; original sampler format RG8,256x256, wrapping, mipmaps and two shader lookups remain. Prequantization RMS matches the original analytical field; decoded RG8 RMS is .38971178 baseline and .38965845 candidate (difference about .014%). Base storage131072bytes each. Candidate22/131072 channels saturate to storage endpoints; original0. Generation uses additional CPU trigonometry once per texture, not per frame, and was not benchmarked. No GPU, memory-saving or FPS claim.

Full-resolution reverse-day images inspected: irregular nearby highlights, but distant transverse bands persist strongly. This refutes changing the tile alone as a sufficient fix; it does not prove the precise remaining cause. Next isolate environment reflection and solar BRDF separately, including distance filtering, before adding new maps or geometry. No need to benchmark/promote an artistically inadequate candidate.

## Reproduction

```
$env:WG_RIPPLE_VARIANT='baseline'; node tools/experiments/capture-canyon-spectral-ripples-20261023.mjs
$env:WG_RIPPLE_VARIANT='spectral'; node tools/experiments/capture-canyon-spectral-ripples-20261023.mjs
python tools/experiments/review-canyon-spectral-ripples-20261023.py
node tools/experiments/audit-spectral-water-tile-20261023.mjs
```

Vite5190. comparison-day-2.jpg is baseline left/candidate right. All images are untouched real renderer captures; only assembly/labels are applied. The generator is kept under tools/experiments and never loaded by the native recipe. Static evidence only; no animation or performance acceptance claimed. No simulation or main changes.
