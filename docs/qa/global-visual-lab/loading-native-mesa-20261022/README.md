# Native central mesa composition

The existing `loadingBeam=diffuse` option now selects the central-mesa atlas layout, atmospheric fog values, soft mip sampling, feathered sides and night fade in LoadingDiorama itself. Default/oblique layouts retain their original composition. Existing atlas ownership and disposal are reused; no additional geometry, texture or draw is allocated.

The comparison harness no longer routes or mutates loading-diorama.js or the backdrop material. Four real day/night landscape/portrait outputs are pixel-identical to the prior routed implementation. Six cached-shadow draws / 16002 triangles, no GL/JS errors. Direction audit passes and world rendering resumes with 19 asset-shadow draws after disposing the garden. Canonical identical images remain in ../loading-diffuse-native-20261022 (reproducible local captures); the original committed matching images are ../loading-day-air-20261022.

The harness still supplies the sky grading and contact QA fixture, so these results do not claim those pieces are integrated. The real native menu-to-load-to-game and cancellation are separately verified in ../loading-native-mesa-flow-20261022, without visual source routing. Five relevant disposal/option tests pass. The native late canvas capture shows the actual moving orbit; it is not a deterministic A/B with the fixed-camera QA capture.

Reproduce: node tools/experiments/capture-loading-native-mesa-20261022.mjs. Real flow: set WG_LOADING_FLOW_OUT=docs/qa/global-visual-lab/loading-native-mesa-flow-20261022 and run node tools/experiments/verify-loading-diffuse-flow-20261022.mjs. Vite port 5190.

Pending: contact/plant-region integration, complete day/night sky parity, region-full UI, and animated-light shadow GPU/CPU cost. No performance improvement claim. No main integration.
