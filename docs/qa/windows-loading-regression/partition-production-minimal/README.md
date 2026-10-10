# Minimal production crop partition extraction

Base: `9d41d25ba032f702728b7921893dae8c005a8ca2`. Selected partition implementation/payload provenance: preserved `c1f3f9b33920dd18b25b2b894e99d2e1bc931e98`; historical authored/compressed GLBs and manifests remain reproducible in source.

The catalogue explicitly names steady/bridge collections. Assets owns one canonical partition and shared textures; the diorama prepares maize, and the unchanged World completes all 40 states/32 bridges through the ordinary generic model/bridge consumers. App changes only an import and preparation await. Scene, simulation, persistence, navigation, audio, menu/library, Rust, smoke and workflow are byte-identical to the base. No rejected crop overlap, trace, scheduling flags or QA coverage/65 wiring are included.

The 11 replacement resources total 40,848,807 bytes, replacing 40,844,796 bytes of runtime GLBs (+4,011). Four retired source/compressed GLBs stay outside dist. Package: 720 files, 445,270,909 bytes, 860 relative links, 24 physical GLBs; +16,744 bytes versus the independently verified official baseline inventory. Receipt lists every changed package path, payload hash and selected source hash. No wall-pack diagnostic resource is introduced.

The usable legacy library loads its separate manifest and `be4bb7e7…glb`; it does not load the replaced crop collections or models.json. A specific closure test confirms its direct GLB payloads remain physical resources. Library files are unchanged.

Source frozen commit: `d332bf842718db50e3fca3b27285abdcadc50c45`. Subsequent receipt commit changes evidence only.

## Checks

- 60/60 contract tests, session58284 exit0, 10,967.2475ms; exact command appears below.
- One additional library-consumer closure test PASS (eight unrelated tests skipped by name filter), 496.2525ms.
- Build exit0, Vite9.96s. Existing chunk-size warning retained. Package exit0.
- Changed-source syntax 23 files PASS; subsequent added library test `node --check` PASS.
- SFX audit retains all126 original files, 100 assigned/26 unassigned and all row semantics; only App source hash/+1 caller line changes.
- Actual Git core.autocrlf=true shared sparse checkout of source `d332bf842718db50e3fca3b27285abdcadc50c45`: 1/1 PASS, 1249.1043ms, exit0. Hash-addressed manifest retains2313 bytes/SHA98e4f7db… with `-text`.

```powershell
node --test tests/crop-library-partition.test.js tests/crop-partition-lifecycle.test.js tests/crop-runtime-integration.test.js tests/crop-partition-app.test.js tests/assets-lifecycle.test.js tests/crop-native-reload.test.js tests/web-package.test.js tests/loading-diorama-disposal.test.js tests/loading-diorama-upload.test.js tests/sfx-catalog-audit.test.js
npm run build
npm run test:web-package
node tools/audit_sfx_catalog.mjs --check
python docs/qa/windows-loading-regression/partition-production-minimal/verify.py
```

## Scope and retained negatives

An initial command named a nonexistent browser-test JS file and exited before running tests; its original tool output remains conversation chunk91b16d (no reconstructed raw log). A subsequent 48/49 test result imported an intentionally excluded historical overlap helper; the copied test was narrowly corrected to exercise real serial World completion. Original failed log is retained alongside the passing log. Receipt-generator directory-enumeration failure is also declared; it did not affect runtime.

No native/CI/GPU run, PR or promotion performed for this extraction. CPU image doubles do not prove native raster, 30 combinations, portrait, composited HTML, physical input or native cancellation. Human approval of G timing remains valid; independent Windows90s readiness failures remain negative. Root native65 evidence in main5573c796 proves naturally66.1947% engine-handler planting4→5/catch-up/hidden-state parity on source7e, not this candidate or physical input; preserve that evidence at later integration. Root extractor7fc, animal benchmark and ABBA tools remain unchanged.
