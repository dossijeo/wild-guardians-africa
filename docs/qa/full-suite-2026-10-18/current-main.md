# Regression after Wild Engine integration

Baseline: `main` at `30cffd3159caa4c495870fd59c2e2ad3f7319b2c`, Node 20.11.0, npm 10.2.4, Windows. The checked-in production binary `src/world/wild-engine/spatial-savanna.wasm` had SHA-256 `674bdf018817e1fa75e5181525faa3f516b90b9072af844fdc08e64fdcbf6b9c`. No production files were modified for these runs.

| Run | Passed | Failed | Skipped | Duration |
| --- | ---: | ---: | ---: | ---: |
| `npm test` | 4,465 | 0 | 60 | 414.1 s |
| Native route and spatial-services test files with the production WASM selected | 78 | 0 | 0 | see raw log |
| Topological enclosure test file with the production WASM selected | 18 | 0 | 0 | see raw log |

The 60 default-suite skips are opt-in native tests lacking their `WILD_ENGINE_*_WASM` environment variables, not test failures. The two focused commands activate those tests against the same production binary. The 12 files used in the 16 October failure comparison also passed separately on this `main`: 121/121, zero skipped. This establishes that the historical 29 failures in that selection are no longer reproducible on this revision; it does not assign their resolution to this audit.

Reproduce from this commit:

```powershell
npm test
$wasm=(Resolve-Path 'src/world/wild-engine/spatial-savanna.wasm').Path
$env:WILD_ENGINE_NATIVE_ROUTE_WASM=$wasm
$env:WILD_ENGINE_SPATIAL_SERVICES_WASM=$wasm
$files=rg -l 'WILD_ENGINE_(NATIVE_ROUTE|SPATIAL_SERVICES)_WASM' tests -g '*.test.js'
node --test $files
$env:WILD_ENGINE_TOPOLOGICAL_CUT_WASM=$wasm
node --test tests/spatial-topological-enclosure-prototype.test.js
```

The exact TAP output of these three runs is in [logs.zip](logs.zip). This is a Node regression result; it does not establish physical-phone performance or perceptual audio acceptance. The acceptance ledger therefore still marks QA-014 and QA-156 as partial, and the full implementation goal remains open.
