# Thirty native loading combinations — 1bf0fb0d

The existing interactive-loading-matrix page ran all six biomes crossed with all five cultures sequentially in native browser tab175. Feature HEAD 1bf0fb0d stayed frozen throughout; latest loading-failure runtime change was d69d7c68. Each child executed the native WorldScene/loading diorama/cinematic recipe and was explicitly disposed with context loss before the next child was created.

All 30 cases completed with verified readiness, preserved camera, unchanged logical state and restored logical state. Every case reported disposed/contextLost true, empty errors, no pending downloads and no failed downloads at completion. The matrix finished done true / cancelled false / active null; its final main element had no child iframe. Console warnings/errors were empty. The tab was closed and browser inventory confirmed empty.

This establishes sequential functional compatibility across the biome/culture combinations for fresh worlds in this QA recipe. It is not evidence of real-menu autoplay, saved-world loading, physical touch behavior, all camera viewpoints, physical peak RAM/VRAM, or smooth frame delivery. Timings and renderer.info counters in the raw report are diagnostic observations, not an isolated benchmark or total memory measurement. Root permitted coexistence of other agents' lightweight CPU archive/verifier work; no other GPU context or own build/test was active during the matrix.

Raw JSON and a completion screenshot are preserved. SHA-256 of the raw report: `bf6d5cef4f47c6f77963201cd93ba97891da58f62403264055ff9a5d8105543a`.
