# Music world QA: preserve evidence during long runs

The six-day Sabana/Mapungubwe/712 music fixture was run on `c2a465714` with
the production WASM (`0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d`).
It reached day 5, step 19,300, with no fixture errors, but the browser driver
hit its fixed five-minutes-per-day deadline. The old driver closed Chrome
without writing any report. That run is **incomplete evidence**, not a failed
gameplay or audio assertion and not proof of a sixth music transition.

The driver now writes a checkpoint every 15 seconds and a final report with a
`driver.status` field. It distinguishes `running`, `complete`, `fixture-failed`,
`deadline-exceeded`, `stalled`, and `driver-error`. Its total deadline defaults
to at least 15 minutes and then ten minutes per requested day; the separate
three-minute no-progress watchdog remains. `WG_QA_MAX_MS` can override the
total limit for diagnostics. A timeout still fails the command, but keeps the
last observed game day, step, event counts, music-pack history, and errors in
the output JSON. Checkpoints are diagnostic snapshots; only `complete`
establishes the requested horizon.

Two current-build checks exercise both paths:

| Run | Outcome | Evidence |
| --- | --- | --- |
| Forced one-second deadline | Nonzero exit; checkpoint says `deadline-exceeded`, day 1, step 100, no browser or fixture errors | [forced-deadline.json](forced-deadline.json) |
| One paid 3D day | Exit 0; day 2 reached after 4,170 steps, A→B, one crop delivery and one resolved incursion, zero errors, WebAudio context closed | [one-day.json](one-day.json) |

Reproduce after starting Vite on port 5217 with a local Playwright module:

```powershell
$env:WG_QA_PLAYWRIGHT_MODULE='C:\path\to\playwright\index.mjs'
$env:WG_QA_URL='http://127.0.0.1:5217'
$env:WG_QA_DAYS='1'
node tools/experiments/check-music-world-dawn-browser.mjs test-results/music-world-day1.json
```

For the forced timeout, set `WG_QA_MAX_MS=1000` before the command. This check
does not expand QA-156's perceptual coverage. The audio output was muted, and
the user handles physical-phone compatibility separately.

`npm run verify:assets` passed on this base revision (25 sources, 507
resources, 126 exact SFX matches). `npm run package:itch` also passed: 919
files, 841 relative links, 17 runtime GLBs, and verified ZIP CRCs. The
generated 387,762,862-byte ZIP was removed after verification to save host
space.
