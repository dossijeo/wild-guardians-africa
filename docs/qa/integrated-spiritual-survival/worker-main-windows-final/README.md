# Final PR25 Windows evidence

GitHub run [38195483599](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38195483599) completed successfully on exact PR25 head `30b1e2dc7a81e4229d95b59f7536e23399120315`. This does not certify the separate Validate game workflow, PR26 or the experimental military model.

The workflow receipt records successful Tauri packaging, executable/installer checks, genuine native minimization/restoration and menu native exit/persisted restart. The downloaded reports were inspected:

- Smoke: `ok=true`, no errors; WebGL2, Worker, storage, 22 runtime GLBs and decoded audio checked in the packaged WebView2 app on `http://tauri.localhost`.
- Visibility: `ok=true`, no errors; native hidden/visible transitions recorded, hidden interval 300,826.3 ms, visibility check passed and simulation resumed afterward. Manual-save confirmation follows the IndexedDB commit.
- Exit-create: exit button found, native process exited with code 0.
- Exit-restore: previous save restored, exit button found, native process exited with code 0.

CI smoke reports world readiness after 198,688.4 ms; the visibility scenario reports 130,074.8 ms. Both use the explicit 300,000 ms CI functional budget. These are instrumented CI observations, not loading-performance acceptance on consumer hardware, and are not directly comparable before/after benchmarks. Native-exit stage elapsed times also include setup/loading and do not measure button-to-exit latency.

The artifact list includes the executable and installer with server digests and IDs; those large binaries were not downloaded locally. `desktop-smoke.json` and `desktop-visibility.json` are uploaded with `archive: false`: `gh run download` attempted ZIP extraction and failed. Direct artifact API downloads recovered their raw JSON and matched both exact server SHA-256 digests. The multi-file exit artifact uses ZIP and downloaded normally. The download-format failure is not a game/CI failure.

Original workflow log, workflow/artifact metadata, small QA reports and exit fixture are retained with hashes in `receipt.json`. These prove CI execution in a packaged Windows app; they are distinct from physical mobile acceptance and a local human Windows usability review. PR25 remains subject to its final full validation check before merge. The frozen military campaign has not been modified.
