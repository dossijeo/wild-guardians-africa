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
