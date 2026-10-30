The Guardian replaces the deformable tutorial portrait and pointing hands with one animated 3D character. It manifests beside Grow, Multiply, Shield and Attack, directs energy from its hands, and disappears. Attack adds directional knockdown/recovery and species-specific damage/retreat audio. This PR remains in development; do not merge yet.

## Implemented

- Editable Blender sources, floating body/eye/mantle rig, wooden eyelids, nine visemes and 62 offline Spanish/English narration sequences.
- Single visible Guardian; sequential attacks; hand-driven VFX; appearance/dissolution, delayed cloth/feather/wood wind, and tutorial HUD/world pointing.
- Five expressive beasts and four workers, bounded articulated ragdolls with baked overflow and authored get-up transitions.
- Awakening ritual with persistent confirmation and final-pulse visual reveal; cancellation/interruption handling and coherent ES/EN button labels.
- Updated work centers and AO/lighting studies. Rejected tree texture/LOD candidates are not installed. Thirty original biome sources are prepared for the separately queued texture-generation work.

## Latest evidence

- [Clean rear and side wind videos](docs/guardian/phase2/pose-layer-fix/README.md): installed 24 wind controls, no Shield obscuring the body, zero recorded errors. Sampled images do not certify every fine intersection.
- [Actual main-game Attack and recovery](docs/guardian/phase2/pose-layer-fix/main-ui-attack-probe.md): real UI/raycast, real cooldowns, one Guardian, recovery and resumed movement; video/receipt limitations are explicit.
- [Active-scene audio disposal](docs/guardian/phase2/pose-layer-fix/scene-disposal-audio.json): one active voice and three queued summons are cleared; AudioContext closes, with zero errors. Physical-disposal evidence is separately indexed in the same folder.
- [Native thirteen-beast comparison](docs/guardian/phase2/performance-components/native-raid-comparison.json): 32 workers, 144 crops, 13 structures, five legal attacks, identical commands and final outcomes in reference/Guardian runs. Both explicitly use spatial-wasm. Reference/Guardian p95 99.880/99.850 ms, p99 166.260/149.530 ms. Severe spikes occur in both; one ordered pair is not causal proof or fluidity approval.
- Historical night-31 campaign measurements used legacy-js despite earlier native descriptions. They are **not** Wild Engine evidence. Corrections are prominent in the associated reports. The new native snapshots are explicitly constructed QA scenarios, not naturally played campaigns.

## Open acceptance and limitations

- Continuous voiced tutorial recording with the full HUD, and perceptual narration/SFX synchronization and mixing review.
- Remaining fine visual/contact coverage across useful camera angles, obstacles, species and simultaneous effects. A fixed world-anchored Guardian can leave frame when the player rotates the camera.
- Wider/counterbalanced performance coverage; baseline engine slowness is investigated separately. Do not infer adequate integrated-GPU fluidity from low component CPU costs.
- The latest measured release package remains over its byte/file limits. This is not a passing release gate.
- Requested image-generated texture sharpening for five original assets in each of six biomes is queued; no new generated textures have been integrated.

Detailed evidence and revision-specific limits: [CURRENT-STATUS](docs/guardian/CURRENT-STATUS.md), [pose/VFX review](docs/guardian/phase2/pose-layer-fix/README.md), [performance](docs/guardian/phase2/performance-components/README.md).
