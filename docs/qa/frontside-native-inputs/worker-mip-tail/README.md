# Native worker source mip-tail diagnosis

Source-only YoungMale Idle, Sabana/day, no shadows, one view at fixture commit 09d1747abbabd7bd719056980feab679648ead04. No candidate comparison, production change or benchmark. Report, screenshots and 18 direct source files are archived with SHA-256 receipts; this is a partial source archive, with full fixture available at the tested commit.

Twelve reads of the same framebuffer are byte-identical. Thirty redrawn source controls still fail the existing visual control threshold: maximum 21 changed RGB bytes, error 59, no alpha changes, tile MAE 0.010757437286277613 exceeds 0.01. No asset acceptance is possible from this control.

Across 31 captured Mesh0 draws (already FrontSide), requested environment mip levels 1–8 read 43,692 bytes per environment; map/normal/roughness/metalness levels 1–11 read 5,592,404 bytes per texture. Recorded rows and FNV fingerprints are stable and bound textures match the material. Level zero was deliberately omitted. The earlier level-zero audit is a separate execution; combining these executions is not simultaneous full-texture equality or causal proof. Dimensions come from CPU image metadata, not inspected GPU storage extents. FNV fingerprints are not cryptographic equality. Bone and depth uniforms remain unsupported in this color readback instrument. Instrumentation itself can perturb execution.

Browser warning/error logs were empty; tab 783 closed and GPU disposed. Four background CPU campaigns were confirmed live before drawing; no Blender or other root GPU scene. This is a source-control diagnosis, not performance or category-wide acceptance.

Verify with node docs/qa/frontside-native-inputs/worker-mip-tail/verify.mjs.
