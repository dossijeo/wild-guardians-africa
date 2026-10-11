# Browser QA of the archived fractional departure

The unified browser and native Computer Use kernel both failed initialization with `failed to write kernel assets ... (os error 3)`. No UI state was inferred from those errors. The repository's Playwright CLI then ran against installed headless Chrome and a dedicated Vite server on port 5217 with worktree-local dependency cache. No campaign process or source was stopped or changed.

## Preserved negatives and harness corrections

- `browser-gate-control/`: the original browser fixture's first navigation reached its 30-second observation deadline. HTTP still served the requested HTML. Its failure/report/log are retained; it is not an approved visual run.
- `browser-gate-control-isolated/`: the same existing fixture passes after isolating Vite's dependency cache from the shared node_modules junction. Desktop, portrait and landscape show a paid closed wall, original 3D worker/murallas, save/reload and the native exit. Its guardian uses a deterministic mocked media edge; this is not an audible voice test.
- `browser-fractional-case-v1/`: the archived viewer failed before rendering. The server had transparently decoded `.json.gz`; a second DecompressionStream rejected the decoded JSON. The viewer now detects gzip's magic bytes before decoding. The negative screenshot, error and log remain.
- The new runner also passes waitForFunction's timeout in the correct third argument. Its previous second-argument object was a page function argument and did not set a timeout. That correction does not bypass readiness or errors.

## Actual archived movement case

The fixture loads the original native terminal snapshot, restores its terrain/obstacles, and calls native walkTo plus gate presentation on a copy. It retains the archived result, clock, ledger, plants, RNG and tasks. Real procedural ground triangles and original worker/wall assets render; transparent extruded buildings represent native collision footprints rather than culture GLB buildings. There are no farming actions or synthetic economic benefits.

The complete runs `browser-fractional-case-v2/` and `browser-fractional-case-v3/` pass at 1280×720, 390×844 and 844×390. All reach `(60,0)` after one reload during movement, maximum displacement 0.24 m per 0.1-s step, unchanged domain tuple and zero captured page/network errors. The final v3 uses a scalar progress query rather than repeatedly serializing the full ledger while polling; the whole-domain comparison runs only when collecting the terminal report. Its preallocated blue trail is visible without rebuilding geometry each frame.

The v3 returned captures and desktop overview were inspected. The original worker is visible at the destination and the trace takes the swept route around surviving walls. The origin capture shows branch artwork obscuring much of the worker near the wall: the navigation collision rectangle is not a triangle-perfect collider for every decorative twig. That distinction is retained; this QA does not certify exact mesh collision or building GLB presentation.

The observer's reload click can occur at slightly different completed frame numbers; v3 reports 916/917/917 steps, not a claim of identical click timestamps or traces across viewports. Directed deterministic reload tests remain the separate evidence for fixed-input replay.

## Scope and remaining acceptance

This is desktop headless Chrome with mobile-sized viewports and actual DOM clicks, not a physical Android test or touch-gesture acceptance. It is a navigation/rendering diagnostic with building proxies, not the complete game's shaders, UI, shadows or broad biome/culture regression. Raw update timings are retained but are not an isolated frame/GPU benchmark. The earlier AB/BA search measurements remain the CPU evidence.

The web build passes in 30.54 seconds with the existing large-chunk warning retained. Browser script syntax validation passes. Native campaign calibration, wider complete-game acceptance and integration review remain pending. No PR or main merge was performed for this candidate.
