# Canyon independently lit submerged sand pilot

Reproduce: `node tools/experiments/capture-canyon-bank-litbed-review-20261022.mjs`, Vite5190. Seed712/media/1280x720, bed-only and litbed, three poses day/night. Twelve real captures, equal camera/target/time/calls/triangles, no captured errors.

Litbed borrows existing sand color and normal textures. Normals rotate with sand UVs; a ground-like BRDF uses the existing day/night solar and ambient palette, with exponential solar attenuation through approximate water depth. It blends with the water body before the existing Fresnel reflection/specular terms. No new texture objects, geometry or passes; adds one normal sample and BRDF arithmetic. Ground contact AO and macro bed slope are not reproduced, so this is not exact ground-lighting parity. Existing water visibility approximates bed shadows, not ray-traced transmission.

Normal-camera day/night inspection: removes dark edge tendency of previous wet-bank test, but daytime bright fringe remains visibly separate from adjacent bank. It does not solve the straight physical intersection or reach the mockup. Retain QA for study, no native adoption/performance claim. Other poses are captured but not individually reviewed here.

The sand texture alone does not match the existing mixed sand/rock exposed-bank material everywhere; a more faithful shared material mix is needed before increasing detail or benchmarking. Do not claim all remaining discontinuity is geometry. Prior color-only, granular and wet-bank trials remain documented as alternatives, not silently removed.
