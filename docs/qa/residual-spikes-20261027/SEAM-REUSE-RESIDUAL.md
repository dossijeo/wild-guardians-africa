# Residual CPU frame attribution after seam reuse

Reproduce: node tools/experiments/summarize-seam-reuse-residual.mjs. Inputs are the four retained candidate reports from Manglares and Volcanes ABAB; no new measurement or changed benchmark conditions.

Worst CPU frames are 52.965/47.580 ms (Manglares B1/B2) and 62.455/62.385 ms (Volcanes). Their render phases occupy 52.060/46.815/60.850/61.185 ms respectively. Simulation occupies under 0.5 ms in these frames. None of the top three frames per run overlaps a recorded far-operation span. Those spans cover only selected methods >=1 ms: their absence does not rule out other far-scene work or repeated shorter operations.

Next diagnostic must separate WorldScene.renderFrameUpdates generator stages from drawRenderFrame/drawWorldFrame and nested WebGLRenderer.render calls. Existing world-frame-stage/world-frame-draw loading witnesses can provide stage attribution without changing work ordering. Do not optimize navigation, normals or material composition based on these unclassified render times. GPU execution and driver waits remain distinct and unproven by these CPU phase measurements. Wait for the active full test suite before starting a hardware benchmark.

PR219 at 689340487 is in draft, with Linux validation and Windows build/runtime jobs running. The seam improvement is not yet merged.
