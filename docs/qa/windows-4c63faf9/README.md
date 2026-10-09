# Windows build and native visibility — 4c63faf9

[Run 37863687015](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37863687015) completed successfully on the frozen main commit recorded in `run.json`. The executable and NSIS installer were uploaded alongside the native QA artifacts; their exact sizes and identities are retained in `artifacts.json`. The large binaries were not downloaded for this review.

The original smoke and visibility reports were downloaded and validated independently: both contain `ok: true` and empty error arrays. The native window was genuinely minimized for 300605.5 ms. All captured simulation fields match between hiddenStart and hiddenEnd; the menu pause remained on restoration, and the simulation subsequently resumed for 0.9 simulated seconds. The scope deliberately excludes savedAt, notices, tutorial presentation and their nextId counter, as declared in the original report.

The reports are preserved without content changes as gzip files, with uncompressed SHA256 hashes in `receipt.json`. The artifact API returned raw JSON for these v7 artifacts; the installed `gh run download` attempted ZIP extraction and failed. Reading the API response directly recovered the original reports without rerunning the job.

This is a one-plant/one-worker native fixture with an active raid and shield. It does not prove dense-farm performance, loading-feature readiness, full campaign acceptance, physical Android wake-lock behavior or perceptual audio quality. This source precedes the default far-upload isolation change in 621ed947, so it is not Windows validation of that later change.
