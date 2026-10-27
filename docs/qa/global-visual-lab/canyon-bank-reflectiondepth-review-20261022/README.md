# Canyon reflection-depth diagnostic and ground contract audit

Reproduce: Vite on 5190, `node tools/experiments/capture-canyon-bank-reflectiondepth-review-20261022.mjs`. Seed 712, media, 1280x720, three identical cameras, day 150/night 350. Twelve real frames; six pairs have identical camera, target, clock, draw calls and triangles. No captured console/page/GL errors. See audit.json and comparison-day/night.jpg.

Only intervention relative to mixedbed: multiply water environment reflection weight by smoothstep(0,.30,bedDepth). No new texture samples, geometry, passes or production edits. This is a diagnostic, not physically justified shallows or an adopted feature. Timings were not measured; unchanged counts do not establish equal GPU time.

All three day/night comparisons inspected. The daytime pale rim becomes less prominent, but the river still reads as a uniform channel with an abrupt bank. Night improvement is weak. Reflection contributes to the artifact but is not its sole cause. Do not promote this partial fix to native rendering.

## Source audit

- biome-material-source.js groundMaterial417 samples raw RGB base color; despite an older LINEAR comment, the active path describes sRGB base color. african-toon.js explicitly applies toLinear4 (power 2.2) after material composition. The mixed-bed pilot also applies toLinear4 once. No double conversion was found in these two explicit expressions; this is not an end-to-end framebuffer color-space proof.
- Native canyon gravel is multiplied by mix(1, vec3(1.13,.94,.80),.25), then blended with the original color using strength/blend/flatness. The pilot omits that adaptation and assumes flat full coverage.
- Native gravel samples normal and ARH, including up to eight near-field parallax samples. AO mixes .45..1 and is attenuated by the sand weight. The pilot has no gravel normal, ARH, POM or contact AO, and always uses roughness .98.
- Native sand combines its normal with the gravel normal and fades it by footprint. The pilot instead replaces the entire normal with sand, without normal-distance fading.
- Concrete orientation bug in the pilots: native sampleTurfN410 uses T=(.8,0,.6), B=cross(up,T)=(.6,0,-.8). The hand-written bed normal uses B=(-.6,0,.8), reversing the map Y contribution. Correct this using the actual shared function before attributing the remaining result to asset quality.
- Native ground ambient includes contact AO, material AO, normal hemisphere modulation and warm shadow fill. The pilot omits these. It copies sun intensity only, not the complete lighting contract.
- Water retains an environment reflection floor .18, water-specific specular and final color grade. Native sand attenuates its environment specular considerably. This diagnostic isolates only the water reflection mix, not sun specular or final grade.

Next: reuse the native normal transform and gravel/sand composition in a bounded QA variant, verify the material terms independently, then evaluate the bank again. Do not perform another isolated color/noise tuning pass or claim full material equivalence. Authoritative terrain, original silhouettes and simulation remain unchanged.

Process check: no live node/python process matching the earlier ground-shadow-fill or canyon capture/measure work was present before this run; only the new capture was live during the later check. Prior coupled wet-bank rejection remains documented.
