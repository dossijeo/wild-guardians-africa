# Handoff to Sol — ordinary admission and input ownership

See the [technical report](native-ordinary-admission-pick-20261120.md) and [SHA-verified evidence manifest](performance/native-ordinary-admission-pick-20261120/manifest.json). This delivery is subordinate to the integrated plan. **No A5/A6/C4 or 60 fps closure.**

Follow-up: [complete 60 Hz capture and remaining cadence failures](native-60fps-capture-handoff-20261120.md). The collector limitation described below is historical; commit `708eaf6cc` adds bounded gzip streaming, and STREAM1 records the full lifetime without CDP loss. Cadence still fails independently.

## Integrated changes

- `f9af19d9c`: ordinary Host inspection uses the existing incremental resource budget; snapshots are pinned across yields and released/transferred on cancellation/publication. Tests: `remote-ordinary-admission-slices.test.js`.
- `7493b4374`: Surface/Worker picks use one coherent submitted owner across asynchronous inspection. Uses existing acquisition/disposal promises and synchronous Three picking. Tests: `native-pick-owner-coherence.test.js` (including real WASM/client retirement with a virtual GPU).
- `d6be65597`: opt-in ordinary admission and bridge commit phase markers, observer tests, and `tools/guardian/native-audit-ordinary-report.mjs`. No production bridge/Game change.

Validation: 1,310/1,310 tests in 98 selected files, build successful, 9,061 frozen validation inputs unchanged. Three later report-only tests passed separately. The original full Farm GPU scenario passed after both production fixes at 30 Hz, including next task, picks, retained owners and drained disposal. AFTER1's pick failure and the separate 60 Hz trace-loss failure remain archived.

## Commands

From the repository root, use the existing Node 20 executable. Fast regression:

```powershell
.cache/tooling/node20.exe --test tests/remote-ordinary-admission-slices.test.js tests/native-pick-owner-coherence.test.js tests/native-route-pick-frame.test.js tests/native-idle-retained-source-pick.test.js tests/native-task-pending-source-pick.test.js tests/native-audit-ordinary-report.test.js
```

The archived `native-ordinary-pick-validation.json` records the **exact 98-file command, environment, logs, hashes and build command**; it does not represent a complete suite. The impact selector's unexecuted 1,642-file conservative fallback is preserved too.

For the same full Farm scenario, use the original auditor and the environment in archived `native-ordinary-after2-frozen.json`. It requires the existing native/WASM assets, Playwright/Edge and the project's QA Vite server at `http://127.0.0.1:5218`. Do not run another GPU measurement or compile concurrently. Record a fresh source fingerprint and desktop configuration; historical hashes are not proof of a new execution.

```powershell
.cache/tooling/node20.exe --input-type=module -e "import fs from 'node:fs'; import {spawnSync} from 'node:child_process'; const r=JSON.parse(fs.readFileSync('docs/guardian/performance/native-ordinary-admission-pick-20261120/native-ordinary-after2-frozen.json')); const p=spawnSync('.cache/tooling/node20.exe',['tools/guardian/audit_native_farm_birth_world_owner.mjs'],{env:{...process.env,...r.environment,OUTPUT:'.cache/native-ordinary-repeat.json'},stdio:'inherit'});process.exit(p.status??1);"
.cache/tooling/node20.exe tools/guardian/native-audit-ordinary-report.mjs .cache/native-ordinary-repeat
```

The full observer currently **can overflow Chromium's trace buffer at 60 Hz**. This command is reproducible instrumentation, not a promise of loss-free collection. Require the original auditor's successful exit, `trace-complete.json` with `dataLossOccurred:false`, contiguous opportunity/draw ordinals and matching retirement counters. Do not discard an overflowing run or accept its partial maxima.

New flags are `QA_NATIVE_ORDINARY_FRAME_TRACE=true` and `QA_NATIVE_FARM_COMMIT_TRACE=true`, composed with the existing preparation/mutation observer. The reporter reads `PREFIX.json` or `PREFIX.failure.json`, `PREFIX.trace.json`, `PREFIX.trace-complete.json`, and optionally `PREFIX-frozen.json`. It emits `PREFIX-report.json` and `PREFIX-ordinary-report.json`: stage spans, completeness, Host microtasks, hold phases and the worst observed interval. Async stage wall spans include waits/yields and are not exclusive CPU costs. All thresholds use `1000/60`, not 50 ms.

Large receipts, full traces, detailed history reports and checkpoints are gzip-compressed; gunzip them before using this prefix-based CLI. Verify the original SHA against the manifest. Full traces, including the failed 60 Hz trace, are retained. Older reports remain historical outputs; the AFTER2 and 60 Hz ordinary reports include the final CLI's explicit trace-loss status.

## Immediate next work and ownership

Sol can use the corrected Host and picker, reuse the original Farm fixture and consult exact phase attribution without implementing another harness. The fixes avoid unbounded ordinary inspection and mixing submitted clocks with different scene owners. They do not demonstrate reduced allocation counts or global fluidity.

Astra retains the cadence investigation: fix trace collection capacity/observer overhead, repeat 60 Hz collection with complete history, distinguish GC from application allocation, and shorten the remaining causal holds. AFTER2 hold 1 = 23.719971 ms; hold 3 = 18.179932 ms; worst draw-start interval = 40.179932 ms at 30 Hz. The separate 60 Hz functional run passed but its trace overflowed. Windows was restored to 4K30; wallpaper rotation remains disabled.

Game/bridge/WASM, ordinary producer, Farm and canonical migration status remain Sol's. Coordinate further production ownership and CPU/GPU windows before editing or measuring. Sol should continue forwarding every observed target-cadence violation with commit, configuration, complete receipt/trace, timestamp/ordinal, scenario and active owners; Astra diagnoses and validates corrections. Neither an isolated component pass nor a small draw CPU time closes a functional/performance gate.
