# Day-only reflection response, populated Canyon

Native paid campaign fixture, same workers/elapsed, seed712, medium1280x720, native/elevated/reverse cameras, full background. Candidate uses .25+.75*smoothstep(.12,.65,V.y) to scale the environment normal slope during day, interpolating toward original response with uNight. At uNight=1 it preserves wn directly, avoiding renormalization drift. Solar BRDF uses original normal. Browser QA patch only; no native source change.

Six final baseline/candidate pairs (plus warm-up captures): identical camera, target, origin, time, elapsed, workers, draw calls, triangles and resource counts. No captured JS/shader/WebGL errors. All three night images are pixel-exact. Daytime native-camera comparison reduces harsh river bands, but also makes the water calmer. Retain as candidate pending moving-water/camera evaluation; not yet approved for native promotion. Existing banks and blue palette retained. Full biome closure remains unproven.

Reproduce with Vite5190: set WG_REFLECTION to baseline then day and run tools/experiments/capture-canyon-day-reflection-20261023.mjs. Run review-canyon-day-reflection-20261023.py for paired controls/contact sheets. Source helper qa-canyon-day-reflection-20261023.mjs is shared with the separate benchmark. The real screenshots are not postprocessed except contact-sheet assembly.

See ../canyon-day-reflection-cost-20261023 for A/B/A/B cost evidence. No main/simulation change. Next: animated native populated scene and streaming before optional Canyon-only integration.
