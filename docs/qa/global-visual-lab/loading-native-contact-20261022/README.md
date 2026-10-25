# Native loading root contact

The diffuse loading option now owns the previously QA-only root contact shading. Original loading remains unchanged. Root uniforms use a fixed reusable array, initialized once and synchronized by the existing successful planting event. No plant traversal was added to the frame update. Contact is local ambient occlusion, separate from the aligned directional shadow.

Reproduce: `node tools/experiments/capture-loading-native-contact-20261022.mjs` with Vite on port 5190. Seed 712, progress .75, four plants, fixed cameras; day 150 / night 350, 1280x720 and 390x844.

All four images are pixel-identical to loading-native-mesa-20261022, which applied contact through the QA helper. Six calls and 16002 triangles per static capture; no console or GL errors. Direction audit passed all six poses. World shadow handoff remains functional. These counters are not a new GPU timing benchmark or an FPS claim.

The capture still applies the existing QA sky grading and mist horizon adjustment. Native parity for those components and fixed-view planting limits remains pending. Original crop geometry is preserved; full mockup equivalence is not claimed.
