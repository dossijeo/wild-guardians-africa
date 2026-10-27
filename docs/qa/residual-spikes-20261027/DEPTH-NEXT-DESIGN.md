# Next depth investigation after rejected root preparation

Source audit at f2436b59d: scene.drawWorldFrame requests captureDepth when any work/attack/shield/agriculture/material/locomotion VFX prepare returns true. Thus capture is not restricted to building destruction. Disabling it globally would change effects.

smooth-far-transitions.js creates the opaque impostor as a ShaderMaterial clone with custom coverage discard and shared uniforms. It has no authored worldDepthCompatible material. standardDepthMaterial accepts only Basic/Standard and an audited nativeDepthRecipe. withDepthCaptureMaterials therefore conservatively retains its complete color shader in the depth target. The measured smooth-far-opaque-v1 driver wait is consistent with this path.

New hypothesis, not a measured benefit: an authored impostor depth recipe can preserve the identical vertex shader, atlas alpha/discard, coverage threshold and instanced transforms while removing color-only work. This could reduce depth cost and variant dependencies without preparing every published root. Must first inspect original atlas shader, confirm no displacement/alpha dependencies are lost, and compare depth readbacks and real-game A/B. Do not reuse stock depth on custom billboard geometry.

Keep fallback for unknown hooks and dispose derived resources with their source. Preserve partial transparent exclusion, opaque-child traversal, day/night atlas coverage and near/far transitions. Previous all-root candidate remains disconnected. Full fluency objective is not complete.
