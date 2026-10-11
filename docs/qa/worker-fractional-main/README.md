# Production-main backport: fractional worker departure

Base: `origin/main` commit `93dff238`. This branch contains a manual technical backport, not a merge of the experimental economic/military ancestry. Runtime changes are limited to the new bounded connector, two game.js wiring lines and the native iterator yield/smoothing interfaces. Content, economy, crop rules, workforce, powers and raid logic remain untouched.

## Reproduction and repair on actual main

Before modifying any runtime source, the archived worker snapshot replay on main did not move at all (`before-main.json`, maximum displacement zero). The existing valid-origin quarter-cell limitation is thus reproducible on production main, independently of the experimental horde recipe.

After the backport the same original snapshot physically reaches the same village, at most 0.24 m per 0.1-s step, preserving archived result/clock/ledger/plants/RNG/tasks (`after-main.json`). This is a movement-only diagnosis of a copy, not resurrection or recalibration of the original lost campaign. Original worker/wall assets and collision geometry are retained.

The initial transplanted tests passed six cases and failed two because they called `invalidateGeometryQueries`, an API absent from main. That negative is preserved. The obstruction tests now update village geometry through actual main `nav.setState`, without importing the experimental invalidator. All 69 selected worker/navigation/gate tests pass on actual main.

The frozen old smoothing recipe fixture matches main's native raw tail and smoothed output. New synchronous and cooperative smoothing interfaces preserve that output. Four-node search yields split the same A* tail; all AB/BA routes share SHA-256 `e884d96ea0829937e0841df2782dcdef87de43a4f4e60a4612bd50aa8c009b4a`. Timings are retained under concurrent campaign CPU load and changing server/JIT workload, not an isolated general performance claim.

## Browser acceptance and limits

`browser-archived-case/` runs the actual main-based sources in headless installed Chrome at 1280×720, 390×844 and 844×390. All three complete the departure after a DOM-triggered mid-search reload, with unchanged domain state, bounded physical motion and zero captured page/network errors. The procedural ground and worker/wall models are original; buildings are transparent native-collision proxies, with vegetation logic active but no 3D vegetation. This is not full-game visual, physical Android or touch-gesture acceptance.

The dedicated Vite server uses port 5218 and a worktree-local dependency cache. It does not modify or stop other QA/campaign processes. The two active matched horde campaigns retain their frozen sources; this navigation fix is not injected into them.

## Integration gates

Before any PR/merge: finish build/package/assets verification, broader/full suite and final source-scope review on this main-based branch. Keep original failures and comparisons. Do not claim economic/horde balance acceptance, include experimental balance files or merge an unverified build. Saved movement replays and no-path/dynamic-object bounds are directed regression evidence; they do not prove every possible generated landscape.
