# Real gameplay overlay verification

Three real-browser repetitions loaded the hydraulic-v2 raid save through the normal Continue menu, selected Magic → Shield and clicked projected ground. No direct cast() invocation, synthetic event or extra ScreenOverlays instance. QA visibility only reads state/camera to select a target and verify the shield exists. A MutationObserver records the existing production canvas visibility.

Visible durations: 2560.085, 2509.670 and 2523.950 ms. Each run had exactly one canvas, one visible interval, and finished hidden. Screenshots show the cyan edge overlay and an actual shield protecting crops during a multi-animal raid; the central scene and HUD remain readable. These durations include presentation-frame quantization; they are not CPU/GPU timing or evidence that casting is free of stalls.

The runner's strict zero-console-error assertion failed in all three runs. The third diagnostic records both messages as HTTP404 at exactly `http://127.0.0.1:5220/favicon.ico`. No other console/page errors were recorded, and the final diagnostic recorded no failing resource response events. Do not rewrite these raw failures as green runs. They are an identified development favicon issue, separate from the successful overlay duration/real-action assertions. The built nested-path package flow has zero errors (its server explicitly handles favicon requests).

Raw reports are compressed here as overlay-gameplay-first.json.gz, overlay-gameplay-second.json.gz and overlay-gameplay-diagnostic.json.gz. Local screenshot/video directories remain beside this report. Reproduce with `node tools/experiments/check-overlay-gameplay-ui.mjs`; Vite must serve port5220. `WG_OVERLAY_UI_OUT` chooses a distinct output directory. The script deliberately retains the strict assertion and records console locations instead of hiding errors.

Rapid competing spells, terminal priority, expiry and disposal have policy/domain coverage; this browser run verifies only a legal shield through the integrated event path. Tauri acceptance and video review of all menu transitions remain pending. Whole-game fluency remains a separate open goal.
