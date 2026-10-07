# Native animal route safety

Animals now check swept static clearance before advancing on restored routes
or connectors modified by dynamic-body detours. If the actual movement is
blocked, the route is invalidated and replanned by ordinary native navigation.
The existing prop-overlap escape remains restricted to expanded animal exits.

The guard caches a checked four-metre prefix while the route, waypoint,
navigation epoch, radius, ignore policy and expected actor position match.
Dynamic bodies are still checked on every move. A large time step must verify
its full requested movement even when it extends beyond the cached prefix.
When an obstacle further ahead invalidates the prefix, checking just the actual
requested movement allows safe progress until a detour is genuinely needed.

An initial experiment invalidating a whole connector because its distant tail
was blocked passed correctness tests but made the stationary-body night39
diagnostic take about 28 seconds. It was rejected. The final version preserves
the exact actor endpoint, heading, gait and retained route from `75918f8` in
six alternating reference/candidate comparisons (`benchmark.json`).

This is a safety change with measured CPU overhead, not a rendering
optimization or a claim of zero cost. Excluding the first pair, median time
for 125 walkTo calls was about 190 ms reference and 221 ms candidate: roughly
0.25 ms additional CPU per call in this particular diagnostic, with two other
long CPU campaigns running. These are not frame, GPU or phone measurements.
The isolated straight-route test confirms three static checks for 100 moves
over ten metres, instead of a static query on every movement step.

Reproduce the paired diagnostic with
`node tools/benchmark_animal_route_guard.mjs` from the repository root.
It compares baseline game.js against current game.js with shared current
dependencies, and uses the complete archived night39 state with stationary
other bodies. Setup, serialization and hash calculations are outside timing.

Validation: motion/paid-defense/traffic and exact night54 group 33/33;
four directed clearance tests; additional navigation, safe-exit, canyon,
shield, frontal encounter, reload and navigation-warmth group 121/121.
Production build passes. These checks do not establish a completed 100-night
campaign or browser/mobile acceptance.
