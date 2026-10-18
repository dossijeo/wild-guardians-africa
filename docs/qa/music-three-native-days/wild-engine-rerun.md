# Three paid music days on the production Wild Engine world

The browser fixture now creates its terrain, props, collisions and routes with
`prepareWildEngineWorld`, loads that same spatial session into `WorldScene`,
and installs `createEventDrivenTaskPlanner` as the game does. It retains the
ordinary paid center, one mijo per day, daily hiring, physical crop work,
night raids and real `AudioSystem`; output is muted. The world scene asserts
that its terrain and chunk stream are the Wild Engine session's objects.

In headed Chrome on Windows, Sabana/Mapungubwe/712 completed one and then three days:

| Run | Simulation steps | Paid deliveries | Raids spawned/ended | Music packs | Peak owned window PCM |
| --- | ---: | ---: | ---: | --- | ---: |
| 1 day | 4,170 | 1 | 1/1 | A → B | 53,658,624 B |
| 3 days | 12,757 | 3 | 3/3 | A → B → A → B | 74,876,928 B |

Each captured pack used `MusicWindowTransport`, eight original stems at
48 kHz and playback rate 1. The test verified that the previous pack's
window pool reached zero owned PCM after each dawn, native wind retained its
source, the paused dawn snapshot stayed identical during audio updates, stop
left zero active voices and disposal closed the audio context. There were zero
fixture or browser errors and no WebGL error. The engine emitted six
`AnimalRouteUnavailable` events across three raids; all three raids still
ended. This event count is recorded, not treated as proof of perfect animal
navigation.

The original JavaScript-navigation fixture completed the same three-day
scenario in 11,901 steps. Wild Engine took 12,757 steps and produced different
combat events. These are different physically valid routes and action timing,
not a pure audio-performance comparison; no economics, damage, military
pressure or music rules were changed by this QA migration.

Reproduce with a Vite server on port 5189 and hardware Chrome:

```powershell
$env:WG_QA_PLAYWRIGHT_MODULE='C:\path\to\playwright\index.mjs'
$env:WG_QA_HEADLESS='0'
$env:WG_QA_DAYS='3'
node tools/experiments/check-music-world-dawn-browser.mjs test-results/music-world-wild-engine-day3.json
```

Raw reports: [one day](wild-engine-day1.json), [three days](wild-engine-day3.json).
This verifies integrated short-campaign alternation on the official engine,
not subjective listening, physical-phone behavior or a full 100-night audio
campaign. QA-156 remains partial for those reasons.
