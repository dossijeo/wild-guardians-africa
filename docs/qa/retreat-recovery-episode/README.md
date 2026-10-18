# Sabana/712: bounded retreat recovery after an invalid fractional connector

A real topological-player campaign using the V1-pressure candidate and a single
experimental thorn-price change (10 to 8 coins) completed 33 nights, then the
night-34 raid failed the runner's 2,400-second completion bound. This is a
technical failure, **not** a balance defeat or a verified 60-night result.
The archived partial state is
`sabana712-v1-cheap-thorn-day34-partial-state.json.gz` (SHA-256
`e065d4b156658ed245444ffce6c75a34997c7c4632a0ee58719bc35f3cf62759`).
The unchanged Wild Engine WASM SHA-256 is
`b1c0f1804905c605345ed59e3f73c8b77290803db9c7f28180e10d1f88809be8`.
The input `game.js` SHA-256 before this fix is
`280f0a44080a0f16beba7c21feda0c3ad727dacb217e4f8a63bcebf89405a396`.
The original 30-night run and this longer run had the same day-30 state hash:
`93c5577584274ff66ee2e01aab467c4855daac9058a8a8b323cc3832d7957ebd`.

Only `animal-40506` remained active. It was retreating with zero hits at
`(90.3344, 17.6388)`, 14.17 m from its exit. Its position stopped changing;
the final event ring contained 200 identical `AnimalExitRouteRecovery` events.
Every rejected connector replaced `exitRouteRecovery.startedAt`, so the
existing timeout could never fire. The connector's long swept check said the
direct exit was clear, but the first 0.38 m physical landing was not walkable.
This explains why simply accepting that straight line would be incorrect.

The recovery episode now retains its first deadline across repeated failures
and emits one notification. It tries the existing native pathfinder once from
the current position before searching physical connectors. In the frozen
state, that path has 24 waypoints and reaches the actual exit in 60 simulated
steps. Every step passes the native static swept-collision check; there is no
teleportation, change of radius, or early disappearance. If a recovery really
cannot find a valid route, the bounded and audited abandonment still ends it.
The regression test uses the exact saved state and verifies the false direct
connector, the physical route, and arrival at the exit. A smaller unit test
verifies that repeated rejection cannot reset the deadline or duplicate its
event.

Run `node --test tests/retreat-recovery-frozen-sabana.test.js tests/route-event-retry.test.js tests/animal-footprint-connectors.test.js tests/spatial-retreat-recovery.test.js`.
This directed replay proves the night-34 retreat can finish. It does not
replace a complete 60-night rerun or establish a balance recommendation.
