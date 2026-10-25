# Release asset audit: retired ground experiments

The final artistic selection excludes DOF, per user review. Daylight remains enabled.

## Size evidence

All figures below are uncompressed package file bytes, not installer or ZIP sizes.

| Package | Files | Bytes |
| --- | ---: | ---: |
| Previous production, b2497b0695218652672c805c40971ea830686e3a, CI run 39686238830 | 921 | 442715023 |
| No-DOF intermediate | 983 | 477433247 |
| Retired ground assets excluded | 973 | 470759007 |

The new exclusion saves 6674240 bytes. The remaining increase over previous production is 28043984 bytes (6.33%). No textures were downsampled. The ten excluded assets remain in development; the approved fern, terrain and vegetation resources remain packaged. The compact Poly Haven QA model reference is eliminated in the production build through the existing Vite production condition.

Evidence: package-size-before-visual.json, package-size-final.json (intermediate), package-size-pruned-ground.json. Previous production was downloaded from the successful build artifact, not estimated from source size.

## Validation

- Eight ground-details/package unit tests pass.
- Vite build and package validator pass with the reduced inventory.
- Real Chrome run of the reduced package at a nested itch-like URL: final-library-pruned.json. Crops plant eight instances, stone walls select correctly, destruction reaches 50% and resets, SFX search 004 returns exactly one result and playback selects Birds. No page errors or missing requests.
- The SFX harness now waits for catalogue initialization and the debounced filter result; the earlier 126-result observation was premature, not evidence that filtering passed.
- Native no-DOF Tauri build succeeded, but predates this asset exclusion. Final native package/runtime validation remains pending; this report does not claim the final distribution is accepted or ready to merge.
