# Confirmed first-use program wait in depth capture

Production defaults, active Volcanes historical save, medium/low cycle. QA getError and extra explicit render removed; no capture settling. Existing calls timed, main callback and asynchronous GPU/LoAF observations enabled. This is attribution, not performance acceptance.

getProgramInfoLog blocks133.405ms for program90: basic, srgb-linear output, far-ground-native-water-mask-v1:resident-mask-v2:seam-v2. Enclosing renderer.render145.380ms is called by BuildingDestructionPass.captureDepth (buildings.js220), through withDepthCaptureMaterials. World.render162.375ms, main callback165.320ms. Long animation frame229.610ms, blocking127.95ms. Thus an actual first-use program wait remains after removing QA synchronous GL checks.

Quality setting itself takes2.335/1.645/.925ms. Simulation advanced240/240 movement frames,15 new chunks,zero failed/pending stream jobs.24 shader warnings retained. Do not add nested spans or call CPU waits GPU execution time.

Source inspection: depth capture disables shadows and uses a linear render target. Unknown custom materials conservatively retain their color shader. Far ground seam preparation calls prepareNativeFarGpu; investigate whether the exact depth-target/shadow-disabled variant is omitted or released before use. Do not delete the depth pass or discard masks to hide the wait. Next step is exact variant ownership/preparation audit and a minimal candidate, followed by repeated real-game comparison with images.
