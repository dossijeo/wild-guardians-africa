# Recovery from a screen-lock release while the grant settles

The controller could lose automatic recovery if the platform released a lock
immediately after granting it. Its release listener queued a retry, but the old
request promise still occupied `pending`; that retry returned and the eventual
promise cleanup did not schedule another one. The deterministic regression
delivers release in a microtask immediately after listener attachment. Before
the fix,16 tests pass and the new17th fails: only one request, rather than two.

The current sentinel's release listener now clears its own completed request
marker before scheduling recovery. It does not clear a different/newer request.
All17 controller tests pass, including policy denial/fallback, visibility,
late grants, disposal and ordinary release recovery. Production build passes
with the existing size warning. `tests-before.log.gz`, `tests-after.log.gz` and
`source-hashes.json` retain the evidence and exact sources.

Native desktop tab658 exercises the production controller and actual browser
API via `screen-wake-lock.html`: start grants one lock, the visible system-release
button releases it and automatic recovery grants a second. No fallback is
created; `native-reacquired.json` and its screenshot record held=true,2 requests,
2 grants,1 release,errors[]. Exit records2 releases,held=false andactive=false;
console is empty and the tab is closed. This browser test covers ordinary real
API recovery, **not** the microtask fault injection or physical screen timeout.

The reported Pixel10a/Chrome/itch.io problem remains physically unverified.
Host iframe delegation and silent-video fallback acceptance are separate from
this lifecycle race. No claim is made that this fix alone resolves that device.
