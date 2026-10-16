# Sabana/712 day-17 worker access audit

This audit investigates the 16 native worker-home fallbacks in the 30-night
request. It uses the pinned WASM SHA-256
`ff719cfebd15fe0aa11a4ed85abc2912f35527e84e635699429489660a1fd8e7`.
The diagnostic replay used the same game rules and policy; all 19 daily state
hashes matched the original defeat. The diagnostic report is
`sabana20-home-fallback-diagnostic.json.gz`. The exact state before day-17
hiring and the day-17 raid state are preserved respectively as
`sabana17-prewall-capture-day16-end-state.json.gz` and
`sabana17-wall-capture-day17-raid-state.json.gz`.

All 16 fallback calls returned **blocked** (zero unknown, zero unavailable).
Three day-17 workers repeated blocked results from unchanged positions, and
one day-18 worker did the same. The day-17 construction paid 250 coins for 25
new wall modules and reported zero gates. Five previously ruined wall modules
were also intact by the raid capture. The village entry was at `(60, 0)` and
the affected day-17 workers were near `(88, -0.61)`, `(86.69, -3.73)` and
`(88.46, -3.67)`.

Directed native route queries against the raid state returned `blocked` for
all three workers. Removing the 25 day-17 modules made all three routes
`found`. A more discriminating reconstruction kept those new modules but
marked the five repaired older walls ruined: all three routes were also
`found`. In one deterministic reconstruction order, restoring the first four
older walls retained access; restoring `structure-11838` at `(102, 0.69)`
then blocked all three. The actual repair order was not recorded, so this
does not identify which individual repair first closed the live path.

An independent quote of the same 25-module geometry from the saved pre-wall
state also produced zero gates. With all five old walls still ruined, native
routes remained available after applying the proposed modules. The closure
therefore occurred when ruined walls regained collision later in the day,
outside the automatic-gate check run on construction. The existing
`boundaryFaces` pass identified no playable face in the final irregular
layout, despite the native route proving that workers were isolated. A gate
on several north-side wall modules restored native access in the captured
state; changing the repaired east-side module alone to a gate did not.

The repair path in `src/simulation/game.js` restores HP and collision, then
syncs navigation, without an access-preserving gate transaction. This is a
physical access defect that can affect worker retreat and later hiring. The
campaign's final GameOver still obeyed the existing economic rule (zero crops,
32 coins, one operational center), but this audit prevents attributing that
trajectory solely to military or economic balance. The next fix must make a
topology-restoring repair preserve worker access or create a physically valid
automatic gate, with a directed replay of these snapshots. It must not add a
wall-sale recovery rule or grant movement through static barriers.

## Experimental repair correction

The branch now previews a ruined wall's restored collision before payment.
It preserves any confirmed worker-to-village and center-to-village routes;
when the repair would close them, it tests existing wall modules as gate
hosts against the same native graph. The successful proposal is applied in
the ordinary repair transaction. If no valid gate can preserve access, the
repair is not charged or committed. A frozen-state test exercises the real
repair task and confirms that a north-side module becomes an automatic gate,
the repaired east-side module regains its usual wall HP, all three workers
have native routes home, the normal 10-coin repair debit occurs once, and
save/load preserves the result. The preview restores confirmed geometry,
money and an existing route handle before the repair commits. This is a
directed correction; a sustained campaign and multi-biome tests remain
necessary before closing the defect.

## Sustained replay after correction

A Sabana/712 replay on source `b1e2a89d` completed 19 verified raids and
reached an economic defeat at the dawn of day 20. The preserved report is
`sabana20-repair-gate-fix.json.gz`. All 288 native worker-home requests found
a route: zero JS fallbacks, versus 16 blocked fallbacks in the previous run.
The state first diverged on day 17, as expected after changing how ruined
walls are repaired.

One center remained operational at defeat; no crops were alive and 32 coins
remained. The existing dawn minimum was 35 coins (30 hiring reserve plus the
cheapest 5-coin seed). This was not a last-center-destroyed defeat. The
decision to exclude potential proceeds from selling walls remains unchanged.
The replay took 422 seconds versus 394 seconds for the preceding run. Because
the physical trajectories diverged, this does not isolate the cost of the
repair check or establish a performance regression. Multi-biome validation
and cost profiling remain necessary before closing the defect.

## Second-biome regression and directed cost

`tests/spatial-repair-access.test.js` now also loads the frozen Gran Cañón
seed-123/day-7 state. Its two ruined walls (`structure-549` and
`structure-862`) can be restored without closing the currently reachable
worker routes. The plan returns no gate in either case; native preview of
each restored wall confirms those routes remain found, and the game state
is not changed by the preview. The test also executes a normal paid repair
of `structure-549`, checks the exact debit and confirms that no unnecessary
gate is added. Both directed tests passed with WASM SHA-256
`ff719cfebd15fe0aa11a4ed85abc2912f35527e84e635699429489660a1fd8e7`.
This second case checks that the fix does not add gratuitous gates; it is
not a Gran Cañón gate-closure scenario.

The reproducible `tools/experiments/benchmark-repair-access.mjs` times the
access plan separately from streaming and session setup. On this host, three
Sabana day-17 runs requiring one gate took 494.7, 475.8 and 477.5 ms. The
two Gran Cañón walls took 11.3/5.7/6.1 ms and 12.1/6.1/6.7 ms. These are
single-process directed timings, not mobile or sustained campaign results.
The roughly half-second closure case is a cost to reduce before accepting
the repair path broadly.

A follow-up profile on the same Sabana fixture (three iterations) measured
486.8/483.5/483.2 ms, with **four wall-state previews and 20 uncached native
route requests per iteration**. About 438 ms per iteration was inside those
route requests; wall-preview time is inclusive of its route requests. A cold
four-query native batch took 223 ms, comparable to 224 ms for sequential
queries, while later identical batch queries hit a warm native cache. Simply
switching to batching would not remove the repeated cold work after topology
changes. The lightweight graph connectivity query took roughly 1 ms for the
four witnesses and reported `blocked` for three provisional layouts, but its
JS connector check is only a conservative possibility filter for the native
route planner. We did not replace the physical route proof with it: doing so
without cross-algorithm certification could miss a valid access. The next
optimization should remove or share native route work while preserving that
proof, not weaken the worker-access invariant.
