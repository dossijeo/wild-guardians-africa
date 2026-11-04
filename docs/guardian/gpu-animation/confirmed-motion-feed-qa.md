# Confirmed motion feed: horizon and ordering

The presentation Worker may observe a tracked actor's already-executed motion.
`confirmed-motion-feed.js` keeps publication order and now revokes an observed
trace when confirmed simulation time advances past its end without a new trace
for that actor. Pause, invalidation, unavailable physics and an active physical
pose also revoke it. An equal-time publication does not extend the horizon.
This is a consumer safety rule, not a future-motion certificate.
The feed also marks every historical observation
`safeForAutonomousPlayback: false`; `representable` describes only whether its
shape can be encoded, not whether replaying it is physically safe.

`node --test tests/confirmed-motion-feed.test.js
tests/confirmed-presentation-stream.test.js tests/confirmed-gpu-motion.test.js`
passed 14 tests with the repository's Node 20 runtime. The browser audit
`tools/experiments/audit_confirmed_motion_feed.mjs` uses two real mangrove
simulation Workers and compares their snapshots and events. In the captured
run (`confirmed-motion-feed-qa.json`), a real animal produced 383 segments;
the feed accepted 28 ordered observations and revoked two invalidated ones,
rejected a stale sequence and removed the route on pause. Peer observations
were recorded for comparison. This audit does not exercise GPU rendering.

The trace describes motion that has **already occurred**: its end is the
published simulation time and actor position. Replaying it after that
publication while peers and the world are shown at their current state can
introduce visual body crossings or show an actor behind its authoritative
position. There is no certified future horizon, synchronized peer presentation,
or immediate guarantee against structural changes while the simulation Worker
is busy. The GPU motion helper therefore remains unbound to real actors. A safe
integration needs an authoritative trajectory/horizon contract and ordered
revocation or a separately validated presentation timeline before enabling
autonomous replay. No extrapolation, collision authority or game mechanics are
changed by the feed expiry rule.
