# Handoff to Sol: complete 60 Hz evidence

[Report and remaining failures](native-60fps-capture-20261120.md) · [28-artifact manifest](performance/native-60fps-capture-20261120/manifest.json). Subordinate to the integrated plan; no gate closure.

Next code handoff and revised ownership: [bounded compiler admission candidate / smaller QA histories](native-pipeline-admission-handoff-20261120.md). Astra supplies focused corrections; Sol performs integration, broad tests and GPU validation. The previously proposed Astra GPU comparison is cancelled.

`708eaf6cc` replaces the original Farm auditor's in-memory trace export with bounded compressed streaming and explicit buffer capacity. Files: `native-audit-trace.mjs`, `audit_native_farm_birth_world_owner.mjs`, `native-audit-ordinary-report.mjs` under `tools/guardian/`, plus `native-audit-trace.test.js` and `native-audit-ordinary-report.test.js` under `tests/`. No production changes in this delivery.

```powershell
.cache/tooling/node20.exe --test tests/native-audit-trace.test.js tests/native-audit-ordinary-report.test.js tests/native-audit-mutation-report.test.js
```

Expected: 15 passing tests. The original auditor command and scenario are unchanged. Use `QA_NATIVE_TRACE=true`; `QA_NATIVE_TRACE_BUFFER_MB=512` is now the default. Every output prefix must be new. The exact full Farm environment is in archived `native-ordinary-60hz-stream1-frozen.json` (server `http://127.0.0.1:5218`, existing WASM/Edge/Playwright required):

```powershell
.cache/tooling/node20.exe --input-type=module -e "import fs from 'node:fs'; import {spawnSync} from 'node:child_process'; const r=JSON.parse(fs.readFileSync('docs/guardian/performance/native-60fps-capture-20261120/native-ordinary-60hz-stream1-frozen.json')); const p=spawnSync('.cache/tooling/node20.exe',['tools/guardian/audit_native_farm_birth_world_owner.mjs'],{env:{...process.env,...r.environment,OUTPUT:'.cache/native-60fps-repeat.json'},stdio:'inherit'});process.exit(p.status??1);"
.cache/tooling/node20.exe tools/guardian/native-audit-ordinary-report.mjs .cache/native-60fps-repeat
```

Coordinate an exclusive GPU window, freeze current inputs and record the actual display mode first. These commands do not change Windows to 60 Hz and do not establish a new source freeze automatically. Archived STREAM1 used temporary 4K60 and restored original 4K30; a replay on current settings is a different environment. Sol's native rebuild after STREAM1 is not the runtime tested by that receipt.

The reporter reads `.trace.json.gz` directly; do not create a second raw trace alongside it. For archived analysis, decompress the large receipt and detailed report gzip files to a new prefix, retain the original trace gzip, and copy completion/freeze metadata with the same prefix. Check SHA against the manifest. The older overflowing trace remains a failed run, not superseded evidence of success.

Use the new evidence immediately to avoid incomplete-history conclusions and repeated full-fixture construction: 4,964 draws/5,008 opportunities, 1,096 complete admissions, retired-drained, no CDP loss. Do not confuse that with fluidity: hold1=23.850 ms, hold11=8.175 ms still misses an opportunity, and the bootstrap gap is 168.275 ms. The GPU EndAccessImages block and concurrent Dawn task are localized but not causally resolved. Snapshot duplication/GC remains a hypothesis. Astra continues those corrections; forward new violations with commit, configuration, receipt, full trace, ordinal/time and owners.

Sol can continue the independent native Task-stop work under the agreed ownership. Keep dependent producer/cadence acceptance open. Incorporating these results into canonical checklist/status documents remains Sol's responsibility. The documentation/evidence commit follows the collector commit and is identifiable with `git log --oneline -- docs/guardian/native-60fps-capture-20261120.md`.
