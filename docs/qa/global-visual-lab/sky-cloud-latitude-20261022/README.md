# Rejected large negative latitude shift

Offset -.09*smoothstep(.1,.5,uv.y) removes most visible clouds in all three day views; reject artistically. Night two pairs exact, one differs by a single green channel step in one pixel (see pixel-deltas.json).

Reproduce with Vite 5190, WG_REVIEW_BIOMES=sabana and the matching capture-<folder>.mjs / package-<folder>.py in tools/experiments. Twelve real campaign images, seed712, media,1280x720, three low cameras, day/night. Baseline is the retained cloud-protected sky grading, NOT the original ungraded sky. Every pair matches camera,target,time,draws,triangles; no recorded errors. Geometry, vegetation, lighting and textures unchanged. Four RGBE texelFetch calls remain; no new draws, textures or render passes. Shader latitude arithmetic only. QA route, not production integration.
