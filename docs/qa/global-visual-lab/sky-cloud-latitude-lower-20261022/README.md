# Rejected positive latitude shift

Offset +.045*smoothstep(.1,.5,uv.y) replaces the cloud band with smooth haze; reject artistically. Night one exact pair, one one-channel-step pixel, and a third with localized difference in a 5x4 foliage region at (246,186), max27/255. That control is not pixel-exact; its source is not established, so do not attribute it to sky shading. No timing claim for this rejected variant.

Reproduce with Vite 5190, WG_REVIEW_BIOMES=sabana and the matching capture-<folder>.mjs / package-<folder>.py in tools/experiments. Twelve real campaign images, seed712, media,1280x720, three low cameras, day/night. Baseline is the retained cloud-protected sky grading, NOT the original ungraded sky. Every pair matches camera,target,time,draws,triangles; no recorded errors. Geometry, vegetation, lighting and textures unchanged. Four RGBE texelFetch calls remain; no new draws, textures or render passes. Shader latitude arithmetic only. QA route, not production integration.
