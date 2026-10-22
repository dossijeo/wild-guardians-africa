# Six-biome closure review â€” candidate1

This is an evidence-based closure plan, not a completion declaration. Reference/current JPGs preserve aspect ratio, using actual mockups listed in ART-REFERENCES.md and the latest native medium day game-view captures. Different world populations/cameras are explicitly not pixel-equivalent. Current images are sources already recorded, not new renders.

Frozen configuration: tools/experiments/global-closure-recipe-20261022.mjs. Includes reviewed full backgrounds, regional/natural water, cupped Mangrove leaves and balanced Canyon bank. Historical recipes are unchanged. Experimental ripple variants and early-discard variant excluded because no sufficient overall benefit was established; they remain available for later work.

Closure gates for each biome:
1. Side-by-side overall art assessment at normal gameplay scale: material volume, palette, lighting contrast, characteristic vegetation and integrated water. Preserve original silhouettes; no demand for identical placements.
2. Inspect close, normal and elevated views, day/night, with complete impostor/mountain backgrounds and actual seed/camera/clock recorded.
3. Representative water edges AND inhabited/cultivated area. A camera without water cannot prove shore completion; sparse population alone is not a material defect.
4. Continuous movement and chunk excursion without obvious visual breaks; distinguish recorded errors, pending background work and image residuals from proven regressions.
5. Comparable CPU/GPU/frame-time evidence on modest profile for the selected combination, plus resource/streaming checks. Preserve attractive costly variants for optimization; no unsupported zero-cost claim.
6. Selected changes available natively through reproducible recipe, no simulation/navigation/rule modifications. Document known limitations and final recommendation.

| Biome | Current art evidence | Closure work still required | Optional refinements |
|---|---|---|---|
| Sabana | Warm continuous grass and shadow separation in reviewed-five-biomes | Combined candidate low-profile/motion check; inhabited/cultivated framing and overall comparison | Small ripple pattern changes |
| Gran Rio | Dense grass, distinct soil/water margin, full backgrounds | Check near/far material transition and representative inhabited/riverside views; combined modest-profile evidence | Extra microdetail only visible close up |
| Mangroves | Cupped leaves, moss, deep blue water; leaf-specific cost/motion evidence | Resolve or demonstrate acceptable broad green uniformity at normal view; ensure leaf/soil variation reads naturally, then combined review | Individual leaf decoration |
| Desert | Warm dunes and accepted shadow richness retained | Water gate not applicable: authored desert profile fluid=none and no water assets; inhabited/cultivated scene and combined low/motion checks | Further dune detail if not visible at gameplay scale |
| Volcanoes | Rock/ash contrast and luminous lava retained | Review normal-scale warm/cool balance against reference and lava edges in motion; combined modest-profile evidence | Additional fissure microdetail |
| Grand Canyon | Stratification/shadows, balanced native bank, cost and stream/motion evidence | Representative richer riverbank/cultivated scene, combined low-profile and water-time animation check | Minor repeated distant highlights unless dominant in normal play |

These are unresolved evidence/art questions, not a claim every item is a confirmed defect. Global blockers also include final combined six-biome report and PR review readiness. Start-menu layered/parallax redesign remains deferred until this work closes, per user instruction.

Stopping rule: once the gates are evidenced and no important defect dominates normal play, close the biome with explicit limitations. Move minor residuals to optional backlog rather than repeatedly redesigning accepted systems. Reopen only for a demonstrated regression or unmet requirement, not merely because another variation is possible.

Immediate next action: representative scene/framing audit, prioritizing Desert modest-profile checks and Canyon riverside coverage, plus targeted Mangrove ground variation. No further water-ripple micro-experiments until their normal-view importance is established.

Correction: initial oasis gate was an unsupported assumption. Inspected biome-desert.json: fluid=none, no assets with water. spatial-savanna.cpp preparePonds skips biome1 and fluidLevelFor returns0. Do not add an oasis to satisfy a QA gate. The existing dry-biome scope is unchanged.

Additional required acceptance evidence: matched current-main versus selected experimental captures for all six biomes, not mockups alone. See ../main-five-biomes-comparison-20261022/README.md and Desert pilot. Thirty additional pose/time/origin pairs pass; normal-day review identifies Mangrove cover repetition as a real remaining art defect. Other views still require perceptual review.


Populated Desert update: reproducible medium/low benchmark and matching day/night/three-view captures completed in desert-populated-frozen-cost-20261022 and desert-populated-frozen-20261022. Pre-game pause removes variable footstep effects. Medium retains approved cast shadows; low is a measured visual compromise. Earlier populated motion remains sampled evidence and used late pause; do not equate it to exact saved-state benchmarking. Active play/long streaming and final combined audit remain open.


Canyon inhabited-bank update: gran-canon-populated-native-camera-20261022 and main-canyon-populated-20261022 now provide exact saved-state/camera day-night comparisons with 12 crops and two workers. Generic cross-biome framing was rejected for cliff obstruction; native Canyon framing used. Normal day/night art improves clearly over frozen main. Water reflection repetition, animated review and combined modest-profile costs remain pending. Mangrove dense original is explicitly user-approved (LEFT in the fringe comparison); do not reopen its density/color treatment as a closure requirement.
