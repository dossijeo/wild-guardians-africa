# Native building color — repair and collapse lifecycle

The opt-in `lifecycle=1` mode in `tests/browser/embedded-color-pilot.html` compares the existing runtime GLB with its Tinify color candidate through production `Assets.building`, `NativeBuilding`, `centerVisualDamage` and `BuildingDestructionPass`, including native debris and the depth-aware smoke pass. Both actors share the building seed, entity states and frozen elapsed time. Candidates remain outside production assets.

## Evidence captured on 2026-10-07

Mapungubwe: 32 screenshots visually reviewed (baseline/candidate × day/night × eight states), eight completed GPU readback reports containing 96 pairs, no GL errors, fixture errors or console warnings/errors. Browser tab 680 was closed after capture. The verifier hashes both actual GLBs, checks the captured asset receipts, camera/target and screenshot dimensions, checks every readback row, and checks both actors' native states independently against the expected lifecycle.

Reproduce receipt verification with `node tools/verify_native_building_color_evidence.mjs mapungubwe --lifecycle`. Candidate files under `.cache/embedded-colors-remaining` are required. Historical receipts deliberately reject a later runtime GLB with a different hash.

| State | Entity | Native visual damage | Elapsed seconds |
| --- | --- | ---: | ---: |
| initial | intact, 600 HP | 0 | 0 |
| damaged | intact, 210 HP | 0.65 | 1 |
| repaired | intact, 600 HP | 0 | 2 |
| collapse-start | collapsing, 3.2 s remaining | 0.79 | 3 |
| collapse-middle | collapsing, 1.6 s remaining | 0.895 | 4.6 |
| ruined | ruined, 0 HP | 1 | 6.2 |
| ruined-settled | ruined, 0 HP | 1 | 8.2 |
| rebuilt | intact, 600 HP | 0 | 9.2 |

The reviewed candidate introduces no obvious added motif, roof-seam, destruction-edge or particle defect at the captured framing. Damage and collapse generate matching smoke/debris counts in both actors; repair/rebuild clears particles and restores the intact meshes. For each variant and light, the repaired and rebuilt screenshot bytes exactly match that variant's initial screenshot, checked by SHA-256. Fully ruined states hide both outer and inner meshes while retaining ash/debris. The JPEG screenshots are perceptual records; loss of exact color equivalence between baseline and candidate is measured separately in the readback reports. No claim of pixel-identical intact textures between those variants is made.

## Scope and remaining gates

This is a frozen front-view render sequence over a flat QA floor, with fixed native day/night light. Six biome labels repeat that same native building lighting; they do not establish six full-world scenes or different building palettes. The bottom report panel obscures part of the floor/base, and the toolbar may obscure high flying debris. No HDR environment, continuous-collapse video, worker repair route, reconstruction charge, economic behavior, mobile result, RAM saving or frame-time improvement is established here.

Lifecycle review of Etiope, Saheliana and Musgum remains pending. The five cultures' separate intact/35%/65% front/back day/night reviews are archived in `../embedded-building-color-native`. These candidates have not yet replaced the production building GLBs.

## Suajili lifecycle and directed regressions

Tab 681 captured and closed after the same eight-state sequence: 32 screenshots visually inspected, eight finished comparison reports and 96 readback pairs. `node tools/verify_native_building_color_evidence.mjs suajili --lifecycle` passed, including asset hashes, matching camera/state/particle counts, empty warnings/errors and exact initial/repaired/rebuilt screenshot bytes within each variant/light. No obvious additional straw-roof, railing-motif, plaster, destruction-edge or smoke artifact was found at the captured framing. The bottom panel obscures some steps, planters and ruins; this does not establish every surface or a full-world repair journey.

The first navigation on port 5173 remained on the loading header without initializing the module or producing an error log. It did not yield evidence and was not counted as a successful run. Navigation of the same tab to the existing main QA server on port 5181 initialized the lifecycle correctly; all archived Suajili captures come from that successful page. No production fix or explanation of the earlier server's module initialization is claimed.

On main `640fe0e9`, `node --test tests/buildings.test.js tests/destruction-native.test.js tests/approved-embedded-colors.test.js tests/embedded-candidate-key.test.js` passed all 34 tests with no skipped/cancelled cases (19.672 s). [Full output](directed-tests.txt), SHA-256 `6c167d67da1710225ef3d26d9acca4079d377c8a0438f8fc4c9d22290373e391`. These regressions cover native destruction, renderer state recovery, real rounded repair debits, source/recipe guards and model-specific candidate isolation. Their building fixtures use original models and mocked renderer paths; the browser captures separately exercise the actual compressed GLBs and GPU passes. Neither result establishes physical mobile acceptance or a performance improvement.
