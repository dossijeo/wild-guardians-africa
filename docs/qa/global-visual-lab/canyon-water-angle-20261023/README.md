# Canyon reflection angle response

Source c47653ebb, QA-only, seed712 medium1280x720 full far backgrounds. Flat reflection direction and flat Fresnel response are independent diagnostic variants, three daytime poses each. Both reduce some band contrast but neither alone resolves the effect. No production material edit.

A third candidate uses reflectionN = normalize(vec3(wn.x * factor, wn.y, wn.z * factor)), factor=.25+.75*smoothstep(.12,.65,V.y), for both environment reflection direction and Fresnel. Original wn remains for direct solar BRDF. No new texture reads, textures, passes or geometry; adds ALU and normalization. It is an artistic grazing-angle approximation, not a physically integrated microfacet BRDF or measured optimization.

## Visual assessment

Grazing candidate materially reduces bright repetitive bands in the reverse daytime view while retaining some water undulation. Nearer/steeper-view reflections remain. However the night comparison becomes excessively smooth: **retain as a QA candidate only, do not promote this all-hours version**. Next gate the attenuation to daylight, then validate a populated native camera path with wind/time evolution and matching GPU benchmarks. Reducing water detail indiscriminately is not acceptance.

The six candidate screenshots and six isolated-component screenshots have matching camera/target/origin/time/draw calls/triangles against the previous baseline; no captured JS/shader/GL errors. Three first daytime views have different resident geometry counts; later views and candidate night resource counts match. Therefore no equal-memory/performance claim. Baseline references come from canyon-spectral-ripples-20261023/baseline; its material source is unchanged during these QA turns. Existing QA cameras are not full populated gameplay acceptance.

Compare grazing-day-2.jpg and grazing-night-2.jpg (baseline left). The side-by-sides use untouched renderer images. No motion or GPU timing yet, no default changes, main untouched.

## Reproduce

Vite5190. Set WG_WATER_COMPONENT to flat-direction, flat-fresnel or grazing and run node tools/experiments/capture-canyon-water-angle-20261023.mjs. Run python tools/experiments/review-canyon-water-angle-20261023.py to check all controls and assemble candidate day/night pairs. The script asserts the expected shader token is present before patching.
