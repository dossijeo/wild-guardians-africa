# Current-model species recovery cycles

Production state: c3de647a1. Three separate actual WorldScene/Game.tick night cycles use the catalog GLBs and their retargeted authored stand-up clips, not the facial-candidate override. `assets.json` records their source identifiers and SHA-256 hashes. All casts use the normal automatic Guardian placement and impact direction. The warthog and buffalo use the strategic view; the rhino uses the existing lower recovery camera to inspect its support more clearly.

Each cycle contains one Attack, physical fall, supine roll, authored get-up, and resumption of the animal controller. All three finish within the 12-second simulated observation, with zero down actors, zero retained physical worlds/bodies, no reported errors, zero roll failures and maximum one Guardian. Only AuthoredBeastRecovery appears in their recovery traces. The recordings contain audio tracks; sound selection traces are available but subjective audio quality was not evaluated.

| Species | Physical roll (s) | Sampled support gap throughout recovery (m) | Gap after 0.65 s entry blend (m) | Physics CPU p95 / max (ms) | Frames / hidden |
|---|---:|---:|---:|---:|---:|
| warthog | 1.417 | 0.0100 to 0.0586 | 0.0100 to 0.0100 | 3.315 / 12.760 | 282 / 0 |
| buffalo | 1.200 | -0.0070 to 0.0100 | 0.0100 to 0.0100 | 3.620 / 12.040 | 264 / 0 |
| rhino | 1.833 | 0.0100 to 0.0246 | 0.0100 to 0.0100 | 6.175 / 11.355 | 257 / 0 |

The support measurement is the minimum of the existing mesh contact samples relative to terrain; it is not an exhaustive triangle intersection test and excludes tail support by design. The buffalo's approximately 7 mm initial penetration and warthog's approximately 6 cm initial clearance occur during the entry blend from the physical pose. After that blend, all sampled minimum gaps remain at the intended 1 cm clearance. This does not mean every foot must touch the ground during a supine pose.

The contact sheets extracted from the videos were inspected for the visible sequence, loss of balance, roll, get-up and resumed motion. No gross stretching or persistent floating was identified at these views; close-up anatomical review of every frame is not claimed. The rhino's low camera makes its prone-to-standing sequence easier to see. Black contact-sheet tiles are padding, not missing video frames.

These are three single-impact scenarios on the same terrain patch, not proof of every direction, slope, wall collision, species balance or simultaneous heavy-animal interaction. Their CPU measurements are unpaired diagnostic captures; no FPS improvement or complete performance acceptance is inferred. The controller's global maxStepMs is cumulative across runs, so the table uses each report's own physicsTotal measurements.

Reproduce with the species selector and Grabar ciclo seleccionado in `/tests/browser/guardian-combat.html`; enable audio first. Use Vista lateral de recuperaciÃ³n before the rhino run. The localhost video receiver runs on port 5198. Reset cooldowns and legacy navigation belong to the QA fixture, not normal player controls.
