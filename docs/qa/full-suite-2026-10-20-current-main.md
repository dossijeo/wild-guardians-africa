# Regression on current `main` — 20 October 2026

The tested checkout was `7d91abc04b7b03948fb26c439a2cedb474a54533`,
with a clean working tree before and after the runs. The checked-in Wild Engine
binary `src/world/wild-engine/spatial-savanna.wasm` had SHA-256
`0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d`.
The host used Windows, Node 20.11.0 and npm 10.2.4.

| Check | Passed | Failed | Skipped | Result |
| --- | ---: | ---: | ---: | --- |
| `npm test` | 4,482 | 0 | 62 | 733.1 s |
| Selected native route and spatial-service test files | 81 | 0 | 0 | 61.7 s |
| Native topological-enclosure file | 18 | 0 | 0 | 29.5 s |
| `npm run verify:plan` | 123,048 reference assertions | 0 | — | 5,000 allocation cases and 20 context/budget combinations |
| `npm run verify:balance` | — | 0 | — | Approved balance data reproduced |
| `npm run build` | — | 0 | — | Vite production build passed |

The two selected native groups are separate executions with the production
WASM explicitly chosen; their 99 passes must not be added to the default
suite as distinct cases without checking overlap. The default run's 62 skips
are not silently counted as passes. The build retains its known warning about
the large main bundle and the mixed static/dynamic import of
`far-atmosphere.js`; neither caused this build to fail.

Reproduce in PowerShell from this revision:

```powershell
npm test
$wasm=(Resolve-Path 'src/world/wild-engine/spatial-savanna.wasm').Path
$env:WILD_ENGINE_NATIVE_ROUTE_WASM=$wasm
$env:WILD_ENGINE_SPATIAL_SERVICES_WASM=$wasm
$files=rg -l 'WILD_ENGINE_(NATIVE_ROUTE|SPATIAL_SERVICES)_WASM' tests -g '*.test.js'
node --test $files
$env:WILD_ENGINE_TOPOLOGICAL_CUT_WASM=$wasm
node --test tests/spatial-topological-enclosure-prototype.test.js
npm run verify:plan
npm run verify:balance
npm run build
```

These checks cover the current code, native spatial functions and plan/balance
data. They do not prove perceptual music continuity, physical-device
performance or that a campaign can always reach night 100. The acceptance
register still correctly leaves QA-156 partial; the user's separate physical
phone checks do not block this automated regression.
