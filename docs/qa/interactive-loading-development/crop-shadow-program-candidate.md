# Crop shadow-program candidate — QA only

The first-crop trace79 identified an expensive native custom-depth pass. Empty crop batches were invisible during the world's visible-only depth preparation, although their color material variants were compiled.

`prepare-crop-shadow-programs.js` is not imported by runtime. It reuses root's bounded compiler and the fence-lifetime candidate. Original crop InstancedMeshes/customDepthMaterials are compiled against the native directional-shadow render target, with no fog and cloned native lights. This is a hypothesis until actual cache keys match the first native shadow draw.

During the synchronous compile submission it borrows exactly the source properties Three r180's WebGLShadowMap.getDepthMaterial copies. It restores original materials, all depth properties, render target/cube face/mip/viewport/scissor/test before awaiting readiness. Counts, visibility, parents and geometry are never changed. No draw, texture initialization or geometry upload occurs. It therefore addresses a program-first-use hypothesis, not the separately observed texture submission cost.

The helper owns a context-loss latch/abort signal and checks context identity/epoch. Failure and owner cancellation remove its listeners and polling, never adopt stale readiness. Synchronous driver calls cannot be interrupted. Native resources, key fidelity, startup cost, visual parity and unprobed first-crop performance are still unverified; do not promote based on unit tests.

Five tests pass using real Three objects and stub GL submission: native source/lighting recipe and identity; restoration before pending readiness; thrown compile; owner abort; loss/restoration before polling. No browser/GPU scene was opened for those tests. Runtime remains `08fe1462`.
