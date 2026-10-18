# Full-screen overlay performance audit

Source: `4d19c0a43df4e66fde590e3db0bd9a0941ed1906` (`main`, after watering VFX optimization). Chrome hardware renderer: Intel UHD Graphics, ANGLE Direct3D 11. The fixture starts a rendered Sabana/712 world with Wild Engine, pauses simulation, and compares `control → effect → effect → control` for each overlay. Each arm contains 8 warm-up and 60 measured animation frames; timing summaries exclude the first 10. The active overlay is held at mid-animation so short effects receive enough samples. This is a presentation stress test; it does not issue magic or combat commands or claim to reproduce the exact one-shot event cadence.

| Overlay | Media 1280×800: update median | High 1920×1080: update median | High frame interval, control/effect |
| --- | ---: | ---: | ---: |
| Raid | 0.1 ms | 0.2 ms | 33.2–33.3 / 33.3 ms |
| Dawn | 0.1–0.2 ms | 0.3 ms | 33.3 / 33.3 ms |
| Growth | 0.1–0.2 ms | 0.3 ms | 33.2–33.3 / 33.3 ms |
| Multiply | 0.2 ms | 0.3 ms | 33.2–33.3 / 33.2–33.3 ms |
| Shield | 0–0.2 ms | 0.3 ms | 33.2 / 33.2 ms |
| Critical | 0 ms | 0.1 ms | 33.2 / 33.2–33.3 ms |
| Nightfall | 0.1 ms | 0.2 ms | 33.2–33.3 / 33.3 ms |
| Victory | 0.3 ms | 0.5 ms | 33.2 / 33.2 ms |
| Defeat | 0–0.1 ms | 0.2 ms | 33.2 / 33.2 ms |

At medium quality the frame interval median was 16.6–16.7 ms for both arms. At high quality the 3D world was already near 30 fps; activating these overlays produced no repeatable median or p95 frame-interval regression in this run. The high-quality canvas was 960×540 and the medium canvas 640×400, both below the viewport resolution. The synchronous Canvas2D update cost is small, with victory the most expensive of the tested effects. The WebGL GPU timer measures the 3D world, **not** the browser's Canvas2D compositor; its readings therefore cannot establish the overlay's GPU composition cost. `performance.memory.usedJSHeapSize` fluctuated by about ±30 MiB across adjacent arms because of GC and is not evidence of a leak or a precise allocation measurement.

`ScreenOverlays` uses one capped-resolution canvas, one preloaded image per effect, and a 33 ms redraw cap. The canvas is removed and its dimensions reset by `dispose()` when `GameJuice` is released. No production change is justified by these measurements. Follow-up work should profile the compositor and event-triggered overlap on lower-end/mobile hardware, especially multiple world-space spell VFX beneath the full-screen overlay. This result does **not** assess the performance of the world-space VFX themselves or prove the absence of a long-session leak.

Reproduce from this commit with a Vite server on port 5188, Playwright installed, and hardware Chrome:

```powershell
$env:WG_QA_PLAYWRIGHT_MODULE='C:\path\to\playwright\index.mjs'
$env:WG_QA_HEADLESS='0'
node tools/experiments/benchmark-screen-overlays-browser.mjs test-results/screen-overlays-media.json
$env:WG_QA_QUALITY='alta'
$env:WG_QA_WIDTH='1920'
$env:WG_QA_HEIGHT='1080'
node tools/experiments/benchmark-screen-overlays-browser.mjs test-results/screen-overlays-high.json
```

Raw results: [six effects at medium](media-1280x800.json), [six effects at high](high-1920x1080.json), [raid/dawn/nightfall at medium](other-media-1280x800.json), [raid/dawn/nightfall at high](other-high-1920x1080.json).
