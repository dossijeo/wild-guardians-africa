# Canyon water reflection isolation

Source d3c3e2dd5, seed712, medium1280x720, day150, full distant backgrounds, three matching QA views. Four variants: baseline; remove environment mix only; remove direct solar BRDF only; retain both but change environment roughness .10 to .42 (explicit texture LOD .7 to 2.94). All changes are browser QA source overrides, no native material edit.

## Finding and decision

In full-resolution reverse view, removing environment reflection removes the conspicuous bright transverse bands, while removing solar BRDF preserves them. This isolates the environment contribution as their source in this scene. It does not establish whether the remaining mechanism is the sky image, reflection direction, Fresnel modulation or their combination. Removing reflection makes the water flat and is rejected as final art. Removing solar is diagnostic only.

Increasing environment mip filtering softens detail but does not sufficiently remove the distant bands. **Do not promote this constant roughness change either.** Next distinguish reflected direction perturbation from Fresnel modulation using separate normals, then consider angle/distance-aware filtering. Retain real reflections, current approved blue palette and bank integration.

The original three-variant contact sheets and the baseline/filtered pairs are untouched renderer captures with labels. All12captures match camera, target, origin, time, calls, triangles and resource counts; no captured JS/shader/GL errors. review-canyon-water-components checks the first9; the filtered3 were checked with the same fields during assembly. No GPU benchmark: deletion diagnostics remove visual work and cannot be sold as optimizations. Daytime isolation only, no night or motion acceptance. Native gameplay populated-scene acceptance still required for any eventual candidate.

## Reproduce

With Vite5190, run capture-canyon-water-components-20261023.mjs with WG_WATER_COMPONENT set successively to baseline, no-environment, no-sun, filtered. Then run review-canyon-water-components-20261023.py to assemble the three-way diagnostic. Source remains under tools/experiments. Main, simulation and production water unchanged.
