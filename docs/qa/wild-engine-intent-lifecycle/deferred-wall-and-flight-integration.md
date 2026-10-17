# Deferred wall topology and worker-flight integration

This check covers the integration of the read-only wall quote from PR #88 into
the persistent-intent branch (#53), and a flight-route defect exposed by the
same Manglares/712 campaign. It does not change economy, combat, movement
speed, animal composition or virtual-player policy.

## Wall quote: same campaign state and outcome

The paired ten-night runs used the same seed, native-intent mode, spatial
advice, event-driven expanding defense policy and WASM SHA-256
`ed1291d12010ec95e101212427010274ff9eb8c9a244f695ab4f7ed11c9b0cb5`.
The control selected the old speculative quote through a temporary QA switch;
the experiment used the read-only reachability overlay. That switch was
removed after the comparison. Every daily serialized-state hash matched, as
did each daily wall purchase, crop count and cash balance. Both spent 400
coins on day 4 and 560 on day 10; day 10 ended with 56 live crops and 712
coins. `Game.tick` totaled 91.43 s in control and 90.88 s in experiment;
virtual-player decisions totaled 43.91 s and 24.95 s respectively. These are
single-run timings, not a claim about all seeds or biomes. Full reports:
[`legacy quote`](manglares10-legacy-quote-control.json.gz) and
[`read-only quote`](manglares14-deferred-wall-corrected.json.gz) (first ten
rows). The experiment continued through night 14 with all raids verified.

The frozen day-ten quote originally rejected every gate because worker
`worker-4866` was already fleeing without a route outside the proposed ring.
His pre-existing native connectivity answer was `unknown` and his route home
was null before any wall was proposed. The old quote nevertheless returned
56 modules and one automatic gate for 560 coins. The corrected read-only quote
matches that result, without speculative world changes, route requests or
sector reconstructions. The focused frozen-state test checks the exact quote,
unchanged serialization and zero route/preview/sector-update calls.

## Flight-route defect and physical recovery

The same worker remained at `(71.4123, 6.3101)` from night 8 onward because
the ordinary native route from this fractional position was inconclusive. A
physically clear step 0.5 m to the west reaches a position with a valid native
route to the village. The bounded fractional connector previously skipped
this search whenever *any* adjacent grid cell was reachable, even if that
cell could not route home. It now performs the bounded local search after the
ordinary route has failed. The frozen-state test checks each movement segment
against native static collision and verifies arrival at the village. The
normal game transition then marks the worker `home`, hiding the actor; the
normal day-end cleanup removes home workers.

With this correction, a ten-night run and a fourteen-night run have identical
serialized-state hashes for their shared first ten nights. The fourteen-night
run completed with 14 verified raids, zero observer issues, 89 living crops,
847 coins and one operational center. No worker remained fleeing at the end
of any day from day 8 onward. Before the recovery fix, the same branch
completed fourteen nights with the worker still fleeing, 7 living crops and
271 coins. Routes and economic decisions legitimately diverge from day 7;
these runs are a functional campaign comparison, not a pure speed benchmark.
Full reports: [`ten nights`](manglares10-flee-recovery.json.gz),
[`fourteen nights`](manglares14-flee-recovery.json.gz) and
[`pre-fix fourteen nights`](manglares14-deferred-wall-corrected.json.gz).

Validation: the targeted native worker-home and wall-quote tests pass 5/5
against the selected WASM; the fractional-connector suite passes; the playable
suite passes 204/204; and the production web build succeeds. The campaign
establishes stability through this case and fourteen Manglares nights, not
general 100-night balance or universal absence of technical failures.
