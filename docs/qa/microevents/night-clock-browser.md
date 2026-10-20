# Night microevent clock integration — 20 October 2026

The unit clock test added in PR #177 proved the optional `nightFastForward` parameter, but did not exercise the app frame loop. This browser probe loads the frozen Manglares/Wild Engine microevent farm, enables the normal game loop after loading, measures the calm night, forces a visible firefly event, measures again, cancels it and measures the restored night. It uses the actual Vite app, WebGL renderer and `Microevents` controller, rather than calling `Game.advanceReal` directly.

On Chrome/ANGLE Intel UHD D3D11 at 1280×720, simulated seconds per wall-clock second were 5.39 before the event, 0.92 while fireflies remained visible, and 4.98 after cancellation. The event stayed active throughout the middle sample. There were no browser exceptions or failed asset requests. [Raw measurements](night-clock-browser.json) include simulated and real intervals. The differences around the nominal 5× and 1× rates reflect frame scheduling; the test requires a clear relative transition rather than exact real-time timing.

Reproduce with Vite on port 5221:

```powershell
$env:WG_QA_PLAYWRIGHT_MODULE='C:/path/to/playwright/index.mjs'
node tools/experiments/check-microevent-night-clock-browser.mjs docs/qa/microevents/night-clock-browser.json
```

This verifies the live browser wiring for one nighttime event and its cancellation. It does not establish phone frame pacing, all event types, or campaign balance.
