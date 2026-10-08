# Worker source-only GPU color texture diagnostic

Root ran the frozen native IAB fixture at `0511372697d6ab595f2c3c3fa0ff52e80513c27d`, `sourceTwin&controlDiagnosis&closedSubsetV1&sourceStateAudit&sourceGpuInputs&sourceColorTexels&noShadows&limit=1`. Only the original YoungMale Idle view is drawn/compared with itself: Sabana daylight, azimuth 8.2313°, elevation −15°. No repaired candidate is rendered or approved. Mesh0 already uses FrontSide.

Twelve readbacks of the same framebuffer are byte-identical. Thirty fresh original redraw controls still vary: maximum 21 differing RGB bytes, maximum delta 59, no alpha difference. Control maximum tile MAE 0.0107574 exceeds the existing 0.01 gate. The instrument does not relax that gate or establish the cause.

Across 31 captured Mesh0 draws, the bound day/night environment texture objects match the material uniforms and all nine expected levels read successfully. Recorded FNV-1a fingerprints stay constant. Material map/normal/roughness/metalness textures match their material objects; level zero reads 16 MiB per uniform and stays constant. Levels 1–11 remain explicitly unread because of the 16 MiB per-uniform cap. These four uniforms are partial observations, not whole-texture equality. Bone and comparison-depth samplers are unsupported by this color instrument; the separate bone input audit must not be conflated with a color readback.

Dimensions and expected mip counts come from CPU material image metadata, not a queried GPU storage extent. Color attachments are read-only, completeness/legal read pairs are checked, and framebuffer/readBuffer/packing/buffer/active-unit state is restored. FNV fingerprints are diagnostic, not collision-free cryptographic proofs. Instrumentation/readback perturb execution, so this is not a benchmark or proof of stable unobserved inputs.

Four CPU campaigns were verified live before draw (35912/49032/41320/41304), with no Blender/other root GPU fixture. Report/frame/screenshot were exported before releasing the freeze; warnings/errors were empty, fixture reported disposal and root closed tab 782. The receipt binds original report bytes, captured images and 18 direct sources. The full fixture remains at the tested commit. Original assets and production are unchanged.

Next diagnosis: cover the remaining material mips in separate bounded passes and inspect depth through a dedicated legal instrument before attributing the original redraw variation or accepting an asset change. Run `node docs/qa/frontside-native-inputs/worker-color-texels/verify.mjs` to verify the preserved evidence.
