# Preserve the active Windows build during frequent pushes

The Windows workflow runs on main pushes, pull requests and manual dispatch. Its concurrency group remains per workflow/ref, but `cancel-in-progress` is now false. A newer main commit can wait without interrupting the active Tauri build, real WebView2 smoke or five-minute minimization/restoration check before artifact upload.

This does not promise an artifact for every rapid intermediate push: GitHub may replace an older pending run with the latest pending run in that concurrency group. It allows the active run to finish and then builds the latest queued revision. The separate web validation workflow keeps its existing cancellation policy.

Native executable, installer and smoke evidence remain in the Windows workflow's own artifacts. This change does not merge Windows artifacts into the web workflow. The active run and subsequent queued run require terminal results before their artifacts can be described as available.
