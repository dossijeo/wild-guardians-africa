# Query-only native detour around moving actors — rejected prototype

20 October 2026. Experimental branch `codex/native-mobile-detour`, based on
`7d91abc04`. This prototype is **not recommended for integration**.

Wild Engine owns static navigation, while `prepareActorMotion()` checks moving
workers and animals separately. When its small local disc graph cannot rejoin
the existing route, the native adapter has no legacy `findPathSteps()` fallback.
This experiment adds a bounded A* over the selected native profile's physical
segment predicate. A query supplies up to 256 transient body discs. They are
never inserted into the sector graph, static route cache, revisions, or game
state. The returned segments are checked again by JavaScript against current
body positions and native static clearance before replacing the route tail.
An unresolved search returns `unknown`; it cannot certify `blocked` from
possibly nonresident terrain.

The query passes a directed frozen-desert test: it routes around an occupied
center without crossing a body, preserves the native route and topological
revisions, and returns the exact requested endpoint. The directed
`actor-motion`, canyon-traffic, animal-wall-overlap, and retreat-recovery tests
also pass, as does the production Vite build. The WASM grows from 511,344 to
531,562 bytes (+20,218 bytes, +3.95%); candidate SHA-256 is
`06858342c26f0aaec5f381a158c5bf6b2b3149fe1a007a00734c7ec07d6d7fe4`.
These checks do not establish equivalence over all campaigns or biomes.

The same Sabana/Mapungubwe/712 14-night campaign was run in separate Node
processes using this same candidate WASM. For the reference, only the new
adapter method was temporarily hidden; the file was restored immediately
after the run. Worker-only and animal-only runs temporarily gated the new
method in `actor-motion.js`, also restoring it afterward. No economic,
military, task, or collision rule was changed. Each row is one run, so the
timings are diagnostic rather than a counterbalanced performance claim.

| Native detour enabled for | `Game.tick` total | Living crops | Deliveries | Money | Mobile recovery events | Final state SHA-256 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Neither (reference) | 69.113 s | 145 | 1,317 | 899 | 164 | `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05` |
| Workers and animals | 86.725 s | 68 | 1,166 | 1,231 | 54 | `fd19974a64e37c49c1e25b84a9b4befb428e63a23584216c0fb00e516521fae5` |
| Workers only | 71.035 s | 71 | 1,125 | 604 | 93 | `365923ec6d28ba72b97cdc1e58c30716bda20ec89e1e96eea1de896e3798635d` |
| Animals only | 73.830 s | 120 | 1,256 | 1,011 | 137 | `8e3ad429e96750e595cfd041a3a09386dfcee20ffe83cecaea4d37640582a84d` |

Fewer recovery events do not imply better traffic or better simulation. The
native grid search can choose a physically valid but much longer bypass where
the existing local system would make one actor yield or wait. The worker-only
comparison shows that altered worker timing is enough to cause a large
campaign divergence; the animal-only run also changes outcomes. The full
variant is also slower in this run. No benchmark for other biomes or physical
device is claimed.

## First divergence and bounded follow-up

`tools/experiments/trace-mobile-detour.mjs` records one hash of active actor
position, status, task and next waypoint after each tick. With identical
two-night inputs, the reference and unrestricted candidate first differ at
day 1, second 2. Immediately before that tick, `worker-20` is arriving at
`(60, 0)` and wants to rejoin at `(62, 0)`. Seven workers occupy the shared
village entrance. The native detour sends it via `(59, 0)`, `(59, -1)`,
`(60, -2)`, `(61, -2)`, `(62, -1)` and `(62, 0)`: a 6.83 m path for a 2 m
local goal. This explains the first actor-state divergence; it does not by
itself explain every later economic difference.

A second experimental variant rejects a detour longer than
`max(2 × directDistance, directDistance + 1 m)`, returning to the existing
yield/wait behavior. It pushes the first two-night actor divergence to day 1,
second 136. At two nights the reference has 62 living crops and 114
deliveries; the bounded variant has 61 and 115. At 14 nights the bounded
variant has 112 living crops, 1,285 deliveries, 851 coins and 168 mobile
recovery events, against the reference's 145, 1,317, 899 and 164. Its
`Game.tick` total was 128.017 s, but a directed test ran concurrently near
the beginning of that single run, so this number is **not** a clean A/B
performance estimate. The functional deficit alone rules out adoption.

The local cost cap is a useful constraint but does not make this grid search
acceptable. Rejected candidate paths still cost a full native search, and
accepted short paths can change task timing. The next design should evaluate
yielding versus detouring before committing a route and avoid scanning when
the traffic is transient. No threshold was tuned against the 14-night result.

To reproduce the directed checks after building the prototype binary:

```sh
bash tools/build-spatial-savanna-wasm.sh
node --test tests/spatial-mobile-detour.test.js tests/actor-motion.test.js \
  tests/spatial-canyon-traffic-recovery.test.js \
  tests/spatial-animal-wall-overlap.test.js \
  tests/retreat-recovery-frozen-sabana.test.js
node tools/experiments/bench-worker-detour-cache.mjs 14 712
node tools/experiments/trace-mobile-detour.mjs reference 2
node tools/experiments/trace-mobile-detour.mjs candidate 2
```

Any replacement must improve the full campaign without weakening physical
clearance, and should be compared in alternating runs before integration.
