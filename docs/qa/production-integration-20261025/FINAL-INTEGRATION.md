# Final integration: release preparation

Status: in progress. PR #213 remains draft; no merge to main in this phase.

## Baseline and first verified change

`node tools/experiments/audit-release-size.mjs` inventories the built distribution by bytes and SHA-256. Baseline: 1,001 files / 495,994,626 bytes. The ZIP producer rejects more than 1,000 files, but the earlier package validator did not enforce this limit.

Removed only three unused menu payloads (old photographic background, sky, relief mask), including the mapped runtime mask. Authoring originals remain available. The layered sanctuary, totem, surface and Library demonstrations remain unchanged.

Result: 998 files / 495,481,165 bytes, saving 513,461 bytes. This is an initial cleanup, not a substantial package-size solution. Added file-count and total-byte limits to the package validator.

Validation: build passes; package validation passes (840 relative links, 17 runtime GLBs); 12 menu integration tests pass. Built nested-path menu opens in real Chrome with no console errors or missing resources; evidence `release-pruning-menu.json` and associated screenshot. This does not yet validate the entire gameplay flow.

## Scope still pending

- Audit experiment-only runtime branches/assets without removing the approved graphics under `visual-lab` paths.
- Preserve and validate the user-facing Library demonstrations; exclude internal experiments from releases.
- Implement and compare the final lighting and distant DOF references (not implemented yet). Keep HUD and interaction area sharp; assess cost independently.
- Full post-change menu, Library, new/load, interactive loading, day/night transition and save/continue validation.
- Compare six biomes, including Mangrove ferns and fixed512 ground cache, against approved appearance and timing.
- Validate itch ZIP and Tauri distribution, review CI, then merge only after all gates pass.
