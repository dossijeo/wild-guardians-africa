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
## Workshop experiments excluded from releases

The village loader now folds authoring-only selections out at build time (`import.meta.env.PROD`), preserving those branches in Vite development and native assets in releases. Fifteen workshop atlas/geometry files are excluded. The initial build still retained a `mapu-0-art.bin` string because the minifier did not evaluate `Array.includes`; the new package guard caught it. An explicit production branch removed the remaining code. This negative test is recorded in `.codex-qa/release-village-package.log` only transiently; the corrected run passed.

Current package: **983 files / 477,432,027 bytes**, a reduction of **18,562,599 bytes** against the initial baseline. No image quality reduction or model simplification. Build and package/reference validation pass; 13 targeted asset/menu tests pass. Real nested-path Chrome run completed new Mangrove game, save, exit and continue with the same slot. See `release-village-lifecycle.json`; this remains a subset of the final six-biome and desktop acceptance matrix.

## First lighting pilot

`tools/experiments/capture-final-lighting-pilot.mjs` captures original/warm day/night in the actual campaign renderer (seed 712, medium, 1280×720, far vegetation enabled). The candidate changes daylight constants via QA-only route interception; production appearance remains unchanged. `lighting-pilot-bank/comparison.html` presents original screenshots side by side without filtering them.

All four observations: 84 draw calls, 363,173 triangles, no page/WebGL errors. This is **not a performance benchmark**. The warm change is visibly too mild to close the mockup direction. Near and baked far fern lighting are unchanged in this first isolation probe; stronger global grading would create a mismatch and affect water/lava, so it has not been adopted. DOF is still pending. Original settlement-view captures are also retained locally under `lighting-pilot`; the bank view is the representative comparison.


## Current checkpoint: horizon focus and coherent-light pilot

Horizon focus is integrated by default in experimental medium/high; low releases its resources. Six-biome day/night views, resize, quality and Mangrove context restoration pass. Detailed GPU cost and moving-camera ABAB limitations are in `HORIZON-BLUR.md`. Latest package validation: 983 files / 477,437,273 bytes. No merge yet.

The coherent Mangrove lighting pilot extends the earlier test to continuous grass, near fern lighting and a daylight-only baked LOD tint. Four captures report no GL/page errors. Visual inspection shows warmer ground and vegetation but still only a moderate change, not the mockups' stronger lighting separation. Night ground ROI is unchanged; whole-image mean absolute channel difference is 0.0047/255 at night (small dynamic capture differences), versus 2.094/255 by day. Pixel differences are not an artistic acceptance criterion. Keep this pilot isolated; do not declare final lighting complete or adopt the approximate far-fern tint without transition checks. Evidence: `lighting-pilot-coherent/comparison.html`.
