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

Lifecycle review of Suajili, Etiope, Saheliana and Musgum remains pending. Their separate intact/35%/65% front/back day/night reviews are archived in `../embedded-building-color-native`. These candidates have not yet replaced the production building GLBs.
