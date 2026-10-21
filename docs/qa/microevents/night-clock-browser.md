# Night microevent clock integration — 20 October 2026

The unit clock test added in PR #177 proved the optional `nightFastForward` parameter, but did not exercise the app frame loop. This browser probe loads the frozen Manglares/Wild Engine microevent farm, enables the normal game loop after loading, measures the calm night, forces a visible firefly event, measures again, cancels it and measures the restored night. It uses the actual Vite app, WebGL renderer and `Microevents` controller, rather than calling `Game.advanceReal` directly.

The 21 October rerun on `521df0da4` also holds the asynchronous save deliberately for 1.2 real seconds. This checks the interval **before** the event appears, when its reservation exists and the controller reports `pending`. On Chrome/ANGLE Intel UHD D3D11 at 1280×720, simulated seconds per wall-clock second were 5.33 before the event, 0.99 during preparation, 1.01 while fireflies remained visible, and 5.05 after cancellation. Two further sequential runs measured 5.40/1.00/0.99/5.02 and 5.37/1.02/0.99/4.95 in the same four phases; all three passed. The event stayed pending throughout preparation and active throughout the visible sample. There were no browser exceptions or failed asset requests. [Raw measurements](night-clock-browser.json) include simulated and real intervals from the first run. The differences around nominal 5× and 1× reflect frame scheduling; the test requires a clear relative transition rather than exact real-time timing.

Reproduce with Vite on port 5221:

```powershell
$env:WG_QA_PLAYWRIGHT_MODULE='C:/path/to/playwright/index.mjs'
node tools/experiments/check-microevent-night-clock-browser.mjs docs/qa/microevents/night-clock-browser.json
```

This verifies the live browser wiring for one nighttime event, including its asynchronous preparation and cancellation. It does not establish phone frame pacing, all event types, or campaign balance. The controlled save is a QA fixture; no game save is delayed in production.
