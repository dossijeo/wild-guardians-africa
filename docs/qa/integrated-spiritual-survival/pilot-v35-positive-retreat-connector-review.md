# Positive native exit connector from the retained failure

The seed-123 partial snapshot does contain a physical route to the exhausted
warthog's own recorded exit. A read-only diagnostic finds a two-metre swept-safe
connector from (70.49734908369155, 7.241300737920456) to
(70.4187371019411, 9.239755179814308). Native grid routing from that point reaches
(-3, 166.65). Every point and every swept leg of the 159-point combined route
passes the original hostile-body terrain/obstacle checks at radius 1.1.

The retained fine search has visited=4096, nodeCount=2984 and 615 frontier items,
so its visit limit is reached. Its goal check requires a clear direct segment
from an explored point to the distant exit. The existing fallback does not try
linking such a point to a normal grid route. This diagnostic establishes a
positive alternative connection rather than declaring the farm physically closed.

Only six accessible connector candidates need grid queries before success. The
cold probe takes approximately 2,176 ms total; the successful grid query takes
approximately 1,572 ms. Those synchronous diagnostic timings are unsuitable for
a per-frame production implementation and are not a performance improvement.
Use the native incremental path iterator to distribute this rare bridge search
across ticks, preserving bounded work, geometry invalidation, persistence and
final swept verification. Do not run a full synchronous query at each fine node.

The tool asserts the entire serialized game, RNG, ledger, actor and original
snapshot bytes remain unchanged. It proposes a route; it does not move an actor,
finish the incursion or prove dynamic body clearance. Acceptance still requires
native tick replay, all original animals physically exiting at their own exits,
save/reload and collision regression, followed by bounded CPU-cost measurements.

Reproduction:
`node tools/probe-native-retreat-connector.mjs docs/qa/integrated-spiritual-survival/pilot-v35-good-q9-single-hit-sabana-123-twentyone/partial-state.json.gz`

Evidence: `pilot-v35-positive-retreat-connector.json`, including snapshot hash,
all attempted grid queries and the fully validated route. Production and imported
campaign mechanics are unchanged by this probe.
