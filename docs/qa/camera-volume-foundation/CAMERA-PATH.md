# Native five-culture camera route

Main runtime af13fce with the QA fixture/module introduced in this commit. A single background tab 633 loaded cases 2,3,4,5,1 sequentially: Sabana, seed712, daytime, medium quality, same viewport1280×720/render1600×900. Each scene was paused and used original models. Center margin6 horizontal/0.6 vertical; village margin1.6/0.6. No save data or production defaults changed.

The diagnostic button replays pinned Three r180 OrbitControls angular/dolly deltas, preserving the intent wrapper and real scene rendering: focus, ascend, full roof orbit, descend, zoom, close orbit and return above. It temporarily disables damping and restores it even on errors. Generation tokens suspend the other QA animation loop during the route. These are authored deltas; this does not test mouse/touch event delivery or approve temporal smoothness.

Each culture records218 poses in `visual/<culture>-path.json` and a final `visual/<culture>-path-roof.jpg`. All five report zero point-volume overlap, unresolved recovery, terrain conflict and errors, with unchanged simulation. Actual camera-to-target XZ azimuth, independently unwrapped from recorded eye/target positions, completes360 degrees during the roof stage in all five cases. This is stronger than counting requested orbit deltas, but still does not certify every rendered frame's visual quality. Contacts occur during the route, so the check does exercise exclusion.

| Culture | Positions | Actual roof orbit ° | Contact positions | Min/max terrain altitude |
| --- | --- | --- | --- | --- |
| mapungubwe | 218 | 360.000 | 44 | 3.114/20.000 |
| suajili | 218 | 360.000 | 33 | 3.281/20.000 |
| musgum | 218 | 360.000 | 44 | 3.275/20.000 |
| saheliana | 218 | 360.000 | 62 | 3.281/20.000 |
| etiope | 218 | 360.000 | 47 | 3.247/20.000 |

The Suajili final roof screenshot remains too enlarged; Saheliana also exposes a very broad flat roof surface. Thus passing geometry safety does not approve the 0.6 vertical margin. Independent clearance is useful, but model-specific roof/facade calibration remains necessary. Mapungubwe's final view shows more surrounding ground; do not generalize it to all models. Final images are JPEG bytes preserved as returned by the browser, without recompression.

Node tests drive the same QA route with actual OrbitControls and the scene resolver in a flat synthetic arrangement, checking360-degree input, safety, state preservation and damping restoration, including a deliberately interrupted frame. Sixteen directed route/terrain/recovery tests pass. The extracted fixture module passes syntax checking. Production source did not change in this test-only commit; the most recent production build/package validation is af13fce.

Still pending: physical touch/mouse rotation, all six biomes/terrain contexts, visual quality throughout every path, model margins, damaged/streamed/deleted structures, trees, nearby small-object inspection, Continue/Back/raid routes, secondary fade and physical mobile/performance acceptance. No CPU/GPU/FPS/RAM measurement follows from these runs. The temporary tab was closed and GPU returned to the impostor agent.
