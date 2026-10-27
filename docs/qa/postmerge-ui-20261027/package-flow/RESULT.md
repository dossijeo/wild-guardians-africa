# Packaged UI flow — 2026-10-27

Runtime tested: b033d4175, including the near-ground menu surface and readable overlay durations. `npm run build` and `npm run test:web-package` pass: 990 files, 484733195 bytes, 855 relative links. Build retains existing mixed-import and large-chunk warnings.

Chrome headless, 1280×720, isolated nested package URL, default medium quality. No source injection, resource interception or runtime overrides. Run:

```powershell
$env:WG_PACKAGE_UI_REPORT='docs/qa/postmerge-ui-20261027/package-flow/result.json'
$env:WG_PACKAGE_UI_LIBRARY='1'
$env:WG_PACKAGE_UI_OPTIONS='1'
$env:WG_PACKAGE_UI_START='1'
$env:WG_PACKAGE_UI_LIFECYCLE='1'
$env:WG_PACKAGE_UI_VIDEO='1'
$env:WG_PACKAGE_UI_BIOME='manglares'
node tools/experiments/check-production-package-ui.mjs
```

Passed crop demo (8 plants), stone wall selection, 50% destruction demo, sound search/play, options, normal new-game selection and loading, save, exit to menu and continue. HUD restored after reload. `result.json` records zero errors and missing-resource requests; threaded runtime workers loaded in both world lifecycles. Exact saved world is retained in `result-fixture.json`. Final screenshot inspected: terrain, channels, village, vegetation, HUD and tutorial render. This image alone does not validate all foliage LODs or every frame of the loading transition. The complete local recording is `result.webm`.

25 tests pass across menu-generation-parity, menu-library-fullscreen, overlay-policy and game-juice. This is functional evidence, not a performance benchmark. No claim about P95/P99 improvements or load-time equivalence. Overlay actions through the real gameplay UI, full video visual review and Tauri validation of this new UI revision remain open before promotion. Previous PR220 distribution validation predates these UI changes.
