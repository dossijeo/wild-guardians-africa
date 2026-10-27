# Runtime override diagnostic

The first release-border A/B/A/B sequence stopped at candidate run 2: the world remained at 4% for 180 seconds. This is a failed run, not a performance result.

A minimal runtime-only reproduction with the same interception failed for BOTH production and candidate binaries. Each recorded a failed worker module request with `net::ERR_BLOCKED_BY_RESPONSE`; dependency count stayed at 1. The response replacement omitted the development server isolation headers.

The override now fetches the original response and preserves its headers when replacing the body. Both runtimes then initialized successfully with one unused pthread worker and dependency count 0. Evidence: runtime-override-validation.json. The game harness additionally records console errors and failed requests. Production code and binaries are unchanged by this correction.

Full real-game A/B/A/B must be repeated in a new directory; do not combine the aborted sequence with the new sequence. Minimal boot success alone does not validate generation or navigation.
