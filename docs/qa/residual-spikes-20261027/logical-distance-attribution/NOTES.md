# Cached-distance diagnostic: not acceptance evidence

Candidate 778e7d9f9 preserves exact differential outputs in 150 scenarios and passes the existing standby tests. Diagnostic run exited successfully with no game errors, but failedRequests contains an audio Opus request aborted with net::ERR_ABORTED. The strict tail summarizer rejected the run. Do not waive that gate or present it as clean.

Exploratory timing only: logical-preload P99 1.160 ms and far-total P99 7.360 ms, compared with 1.640/9.705 ms in the preceding original diagnostic. Different sample counts and a single pair prevent an acceptance claim. Mean preload invocation dropped from about 0.0584 to 0.0306 ms, but includes cheap cache-hit calls.

Next evidence is sequential real-game A/B/A/B without detailed far-method instrumentation, using baseline source from 3d457f445 and the candidate source captured by the runner. Keep identical populations, quality, camera path and native runtime. Preserve failed raw report and provenance here; no production promotion yet.
