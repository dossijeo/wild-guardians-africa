# Mangrove water-body pigment trial

QA-only broad world-space pigment variation, using existing wetNoise at .12 scale with dark/cool and warm/olive endpoints before the existing lighting/reflections. Sediment blends over that varying base instead of resetting it. Production remains unchanged. No geometry, maps or draw calls added; extra fragment arithmetic is not benchmarked.

Twelve real captures, seed 712, medium 1280x720, three settled poses day/night. Camera, time, calls and triangles match across all six pairs; no browser/WebGL errors. Land moss remains intact. Side-by-side images show the variation breaks flat color somewhat, most visibly at night, but reads as pigment patches rather than convincing water depth. It does not provide a sufficiently clear global artistic improvement for adoption.

Decision: retain as a documented trial, do not integrate yet. The uniform-water issue remains open. Next investigate depth-related absorption/color response using the existing optical-depth data and coherent reflections; do not keep stacking noise. Mangrove's optical depth is derived from wetland coverage, not physical bathymetry, so avoid claiming a physically accurate underwater bed.

Reproduce Vite 5190, `node tools/experiments/capture-mangrove-water-body-20261022.mjs`, then `python tools/experiments/audit-mangrove-water-body-20261022.py`. Initial trial was suppressed by sediment's reset-to-base blend; final retained captures include the corrected compositing. No FPS or GPU-cost conclusion.
