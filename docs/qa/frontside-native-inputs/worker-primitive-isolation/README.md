# Original worker primitive isolation

Native source-only YoungMale Idle/Sabana/day, same first V1 camera as the full-source diagnostic; fixture commit1e9750fc67abe979094ec164b3e2f4d2baa017d9. Original Mesh0 face9365, indices9072/9079/9080, drawRange start28095/count3. The other24 source meshes and all other Mesh0 triangles are omitted only in this QA scene. The original full-model bounds still determine the camera. Attributes/index buffers, rig, pose and material/shader recipe are retained; body already uses FrontSide. No asset modification or candidate is drawn.

Coverage witness: seven source pixels, so this is not an empty-frame pass. Twelve repeated reads of the same framebuffer and30redrawn source controls are byte-identical. All31observed Mesh0 draw records match apart from their labels, including observed GL state, uniforms, matrices, bound VBO/index fingerprints and bone-texture fingerprints. The drawRange and mesh visibility are restored before disposal. Color texels are not read in this probe; earlier texture audits are separate executions.

The full source previously had up to21changed RGB bytes with the same nominal face provenance. Its variation does not reproduce with the isolated primitive. This is not proof of a unique cause: removing other geometry and changing indexed draw start/count can alter rasterization and shader execution. It neither revalidates the full-source control nor accepts any FrontSide repair. Next investigation should examine surrounding/full draw participation with measured coverage and unchanged camera/pose, rather than weakening a visual gate.

Tab784closed, GPU disposed and warning/error logs empty. Four background CPU campaigns35912/49032/41320/41304 and server38492were verified live before drawing; no Blender was reported in that process snapshot, and loading agent confirmed no GPU scene active. No performance, mobile or category acceptance. Archive contains report/frame/browser PNGs and18direct sources with SHA-256 receipts; full fixture at tested commit. FNV fingerprints are not cryptographic equality or causal proof.

Verify: node docs/qa/frontside-native-inputs/worker-primitive-isolation/verify.mjs.
