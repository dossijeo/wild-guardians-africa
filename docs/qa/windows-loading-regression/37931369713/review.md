# Native Windows loading attribution

Run 37931369713 failed the unchanged 90-second readiness gate on ce03e50d. The page remained visible and focused with delivered RAF callbacks. At the deadline the active phase was `load-crop-batch`; world GPU warmup had not begun.

Awaited model phases include maize 11.0 s, bridges 19.3 s, animals 19.7 s and biome 8.0 s. Sky preparation took 8.2 s. These nested/concurrent durations cannot be summed as exclusive CPU or GPU work. Crop frame waits observed so far total 149.7 ms. This contradicts a diagnosis of a shader-readiness stall for this sample.

Next diagnostic preserves the same deadline and readiness, and splits each GLB load from its native GLTF parse callback window. No recipe, quality or asset is removed. The parse window excludes the main GLB response collection but includes nested texture fetch/decode. The synchronous parse invocation is nested within that window.
