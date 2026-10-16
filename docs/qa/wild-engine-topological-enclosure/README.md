# Wild Engine: local topological enclosure cut (experimental)

**Status:** isolated read-only prototype; the game and virtual player still use
the existing planner. Do not merge this as a replacement for enclosure advice.
The prototype has not yet demonstrated a complete buildable, worker-accessible
enclosure on the real campaign sample.

## Scope and provenance

The branch starts from `main` commit `dec9a946a56fdfcfb4145c42907bc6e9577213ff`.
The checked-in baseline WASM SHA-256 is
`7817ebadc3dfa4c4d32f6197b5c4eb53468ad5f7f23293d72b902c23a7707095`.
Experiments use one Windows host (Intel i7-11800H, 8 cores/16 threads, 64 GiB
RAM) and the same single-threaded game rules. The candidate is compiled to an
ignored `.cache` file; the checked-in production WASM is untouched. The first
development build used Ubuntu Emscripten 3.1.5 and emitted an extra WASI exit
import. It was useful for testing, but cross-toolchain timing and binary-size
comparisons are not adoption evidence. The final comparison uses the project's
locally installed Emscripten 6.0.12.

## Current work, classified

| Operation | Current location | Purpose | Needed when? |
| --- | --- | --- | --- |
| Group living crops and assess existing protection | `spatial-intent-state.cpp`, `spatial-crop-enclosure-plan.js` | Select a region to defend | Before topological search |
| Generate up to three rectangular strokes | `spatial-crop-enclosure-plan.js`; expanding bot has another persistent rectangular envelope | Discover a candidate boundary | Replaceable hypothesis |
| Resample a stroke and omit existing walls | `wall-layout.js` | Convert geometry to physical modules | After a cut exists |
| `wallPlacement`, crop overlap, wall material and cost | `quoteWallChain` | Constructible pieces and exact price | Final candidate only |
| `boundaryFaces`, virtual natural obstacles, gate host tests | `planNewWallGates`, `boundary-gates.js`, `boundary-faces.js` | Door placement and playable rooms | Final candidate only |
| Village/center/worker route witnesses and gate portals | `planNewWallGates` | Preserve worker access | Final candidate only |
| `withWallPreview` add/remove barriers and props, rebuild affected sectors, optionally refresh portals, then restore | `spatial-game-session.js` | Validate a hypothetical construction | Final candidate only |
| Five-profile crop certificate | `spatial-intent-state.cpp` | Prove physical protection or report unknown | Final candidate only |
| Prepared quote, budget, purchase, state update and event | `previewWallChain`/`buildWallChain` | Execute a legal command | Actual purchase only |

The ordinary expanding bot calls `wallStroke`, `previewWallChain` and then
`buildWallChain` with a prepared quote. The separate enclosure-advice service
quotes and previews up to three margin sizes. `quoteWallChain` can recursively
retry with fewer modules when it cannot place a necessary gate. Its gate planner
may perform nested wall previews and worker routes. These operations are valid
for **verification** but premature when the only question is which accessible
connections lie between an agricultural group and the exterior.

## Topological question and available data

The graph question is: find a local set of animal-traversable connections whose
removal separates the crop seeds from the exterior boundary. This asks for a
closure **within a chosen local search box**, not a globally cheapest enclosure
anywhere in an unbounded world. A fixed-boundary query would be cheaper still,
but would retain the virtual player's rectangular geometry. The prototype uses
a rectangular *search window* only; the cut inside it can have any contour and
can terminate against natural barriers or existing walls.

`lazy-sectors.cpp` already has per-profile passable cells, directed movement
steps, sector components, graph edges, worker portals, weak regions and explicit
unknown frontiers. `spatial-savanna.cpp` constructs those cells and steps from
the authoritative terrain, props and solid barriers. The native crop index
provides group IDs, membership, value, bounds and protection by animal profile.
No JavaScript terrain grid is built for the prototype.

The C++ query uses a conservative union of the five animal movement graphs.
An edge traversable by any species is eligible for the cut. This can propose
unnecessary barriers when a path would require switching species halfway, but
cannot omit an actual species-specific path for that reason. Any absent sector
in the search window returns `unknown`; animal portals are also currently
`unknown`, since the prototype does not include their nonlocal edges. It does
not infer `blocked` from `unknown`.

## Prototype algorithm and its limits

`local-enclosure-cut.h` builds a flow network over a bounded local cell set.
Crop cells and a configurable two-cell no-cut buffer connect to the source;
passable cells on the search-window boundary connect to the sink. Traversable
steps have nonnegative cut weights; missing or naturally blocked steps have no
edge. Dinic max-flow/min-cut yields open steps to cover. The current native
adapter uses unit weight, approximating wall length, and returns only edge
coordinates and counts. Existing barriers need no new module because they are
already absent from the movement graph. The query only reads native sector
data: **no provisional barrier, sector rebuild, route lookup, money or entity
change** occurs. Capacity is capped at 4,096 local cells and 256 seed points
for this prototype. Memory is O(V+E); general-capacity Dinic has worst-case
O(V²E), so the measured local cost is more useful than a promise of constant
time. For substantially larger groups, the local window must be tiled or the
algorithm revised, rather than silently reporting closure.

The JavaScript conversion prototype maps cut edges to arbitrary polylines and
uses the game's `wallStroke` to estimate module count and price. It does **not**
claim those modules are buildable. The discrete cut can become separate wall
strokes where a natural obstacle supplies the missing boundary. Modules are
2.18 m units, while the cut is on 1 m cell steps; resampling and corner joins
can leave continuous physical gaps. The current full quote, gate selection,
five-profile preview, worker access check and ordinary purchase are retained
as reference validators for this disconnected experiment.

The intended **cheap certification path** distinguishes two cases. When the
*placed modules*, including existing walls, form a continuous self-closing
boundary around the crop group and the normal gate planner places a valid
automatic worker door, the wall and door collision rules already exclude the
animals; do not ask the five animal profiles to rediscover the same closure
by full paths. A closed *drawn stroke* alone is insufficient: omitted modules,
ruins and corner separations must be checked in the placed module chain. When
an open arc terminates at a building or natural barrier, check each exposed
terminal junction against the native solid boundary. For a measured free span
between physical surfaces, the span must be strictly less than the diameter
of the smallest animal footprint (currently 0.85 m radius, so 1.70 m). A
two-arc enclosure normally has four such checks. The topological cut also
has to establish that the intervening natural boundary stays impassable;
checking two endpoints cannot turn an unknown river or missing sector into a
certificate. This preserves arbitrary enclosure geometry without repeated
global path searches. The prototype records terminal junctions and the
clearance rule, but Wild Engine does not yet expose the exact native
solid-surface clearance witness needed to certify those joins. They remain
`unknown` until that focused query and the worker gate/access check exist.
The read-only junction inspector invokes a supplied measurement exactly once
per exposed wall end: two checks for one open arc or four for two open arcs.
It also requires an independent witness that the natural barrier between
those ends is continuously impassable. A self-closing wall face requires an
actual automatic gate; a manually flagged gate does not satisfy this shortcut.

The experimental `quoteWallChain` API now accepts several strokes as one
atomic quote/purchase and places a door only after seeing the combined plan.
This does not itself certify that natural joins close the enclosure. A proposal
could also split crop seeds into separate islands; deciding whether that is
acceptable belongs to the plan contract, not to the flow solver.

The cut is therefore a plausible **first phase**, not a complete alternative
planner. Min-cut is useful for discovering low-length open frontiers, but unit
edge weight is not the same as minimum legal wall-module cost. Placement and
gate penalties must be calibrated only after a contour is demonstrably
convertible. No second spatial authority or speculative overlay has been
introduced. If an overlay is needed for final proof, it should represent only
the selected cut's locally blocked steps and remain read-only; the normal
construction validator still decides whether the modules physically realize
it.

## Measured evidence

The reproducible controlled fixture creates one placement-valid crop on
Sabana/712 with a resident 3×3 chunk area. It is a spatial microbenchmark,
not a legal campaign victory or a physically accepted new enclosure. The
recorded ABBA order is old/cut/cut/old in one process. The full raw reports are
in `six-biomes-final.jsonl` and can be regenerated with
`node tools/experiments/benchmark-topological-enclosure.mjs <candidate.wasm> <biome>`.

| Biome | Existing plan, first run | Native cut alone | Converted candidate total | Existing modules | Estimated cut modules | Candidate certification |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Sabana | 110.3 ms | 2.3 ms | 16.7 ms | 10 | 9 | Four terminal contacts; not checked |
| Manglares | 134.3 ms | 3.3 ms | 119.2 ms | 10 | 10 | Open placed modules; native result unknown |
| Gran Río | 109.0 ms | 3.0 ms | 18.2 ms | 10 | 9 | Four terminal contacts; not checked |
| Volcanes | 103.1 ms | 3.0 ms | 14.6 ms | 10 | 9 | Four terminal contacts; not checked |
| Gran Cañón | 337.1 ms | 1.7 ms | 2.7 ms | 7 | 0 | Existing plan unknown; no cut closure claimed |
| Desierto | 122.8 ms | 3.5 ms | 102.7 ms | 10 | 10 | Open placed modules; native result unknown |

These six rows use the pinned Emscripten 6.0.12 compiler. The earlier 3.1.5
measurements, including negative results, remain in
`six-biomes-emscripten-3.1.5.jsonl`; the earlier pinned-toolchain probe is
`six-biomes-emscripten-6.0.12.jsonl`. The same-process old/cut comparisons are
diagnostic only, and their
"candidate total" values are **not equivalent work** when multi-stroke
validation is missing. In a second Sabana site with one stroke, the same
10 estimated modules cost 100 coins, the accepted rectangular quote also cost
100, but the cut's preview protected four species and returned `unknown` for
the rhinoceros. This is a concrete reason not to promote a cheap abstract cut
to a certified enclosure.

A further diagnostic joined the two Sabana arcs across gaps as long as 12 m
and passed the resulting single stroke through the existing quote and
five-profile preview. The rectangular plan was `ready` at 10 modules / 100
coins. The joined cut produced a **continuous placed wall face with one
automatic gate and no omitted modules**, but required 15 modules / 150 coins
and 120–124 ms. The native crop certificate reported four species protected
and the rhinoceros `unknown`. A targeted native probe in
`sabana-stitch-rhino-probe.json` found `standable=false`,
`localClear=0`, `gridWalkable=0` and `weakRegion=-2` at the crop for that
species. `cropProtection()` therefore finds no valid local connector and
returns `unknown`; the result is not evidence of a hole in the wall. The
probe can be repeated with `WILD_ENGINE_CUT_PROBE=1` on the benchmark command
and is off for timing runs. The structural face/gate
check resolves the self-closing-wall case without repeating five animal path
queries, but a valid worker entry and the exact semantics of damaged pieces
still need regression coverage. The raw current report is
`sabana-stitch-12m-final.json`; the older `sabana-stitch-12m.json` is retained.
The example is also a concrete counterexample to treating a shortest grid cut
plus naïve arc stitching as a cheaper *built* enclosure. The default prototype
restricts stitching to shorter gaps and does not label unvalidated arcs as
closed.

The historical #54 report measured a 35-module/66-crop Sabana/712 day-3 quote
at 6.4–6.6 seconds on a different source and WASM. It is useful context, **not
an A/B baseline** for this branch. This branch reproduces the day-3 workload
and records both arms on the same state in separate reports. The current-main
state hash is `7b7033894dee269d4bf04cb074f1372ef2f84ef280446150cd5f2e2331cb6966`;
it held one 66-crop group. The checked-in binary and the candidate compiled
with Emscripten 6.0.12 reached the **same state hash**. The measured ABBA
sequence was:

| Arm | Existing enclosure service | Native cut + contour estimate | Physical status |
| --- | ---: | ---: | --- |
| Stock WASM, old 1 / old 2 | 30,463 / 29,860 ms | Not built | `unknown`, 35 modules, 350 coins, one gap |
| Candidate WASM, old 1 / old 2 | 29,010 / 29,565 ms | — | Same `unknown`, 35 modules, 350 coins, one gap |
| Candidate WASM, cut 1 / cut 2 | — | 9.43 / 4.95 ms total; native cut 5.96 / 3.67 ms | 21 crossings, two strokes, four terminal contacts, 11 **estimated** modules, 110 **estimated** coins; no physical certificate |

Each existing-service call made 334 wall-placement checks, 38 path calls and
17 speculative previews. Across the six navigation profiles, those previews
caused 37,728 sector updates. The cut made zero wall-placement checks, paths,
previews or sector updates. This isolates the redundant *search* cost, but
the 11-module candidate has not been shown to protect the 66 crops. It cannot
be compared with a legal 35-module build on cost, survival or full bot time.
The full reports are `sabana712-day3-stock.json` and
`sabana712-day3-candidate.json`. Sampling stopped at the day-3 decision point
after the ABBA probe; neither report claims a completed three-night campaign.
The candidate binary is 361,379 bytes versus 349,774 bytes for the checked-in
binary (3.3% larger); no production binary was replaced.

The requested Manglares/712 day-10 run reached the checkpoint with 124 live
crops, but the only group was `unknown`, not demonstrably unprotected or
protected. No valid enclosure quote was made at that checkpoint. A follow-up
attempt to create a controlled breach found no certified protected group from
which to select a perimeter wall and made no game change. Both runs are kept
in `manglares712-day10-unknown.json` and
`manglares712-day10-breach-attempt.json`. Neither is
presented as a speed comparison. The older #54 Manglares timing used a
different source/state and cannot fill this gap.

Reproduce the native tests and query benchmark from a Linux shell with the
project's Emscripten 6.0.12 installation (or its pinned CI image):

```sh
source /opt/emsdk/emsdk_env.sh
mkdir -p .cache
SPATIAL_WASM_OUTPUT=.cache/topological-cut.wasm bash tools/build-spatial-savanna-wasm.sh
g++ -std=c++17 -O2 tools/experiments/test-local-enclosure-cut.cpp -o .cache/test-local-enclosure-cut
.cache/test-local-enclosure-cut
WILD_ENGINE_TOPOLOGICAL_CUT_WASM=.cache/topological-cut.wasm node --test tests/spatial-topological-enclosure-prototype.test.js
node tools/experiments/benchmark-topological-enclosure.mjs .cache/topological-cut.wasm sabana
WILD_ENGINE_SPATIAL_SERVICES_WASM=.cache/topological-cut.wasm node tools/experiments/profile-topological-enclosure-campaign.mjs sabana 3 .cache/sabana-day3.json
```

The last command runs the normal game until the day-3 daylight checkpoint,
profiles a read-only ABBA decision and then stops. It does not commit a wall
or continue the campaign after modifying the native QA index. The browser
build and playable game still reference the checked-in baseline WASM.

## Correctness and validation status

The native C++ test covers an irregular multi-seed crop group, a natural
barrier that reduces the cut, weighted steps, determinism and unknown cells.
The Node test verifies non-rectangular contour conversion and that repeated
five-profile queries leave game state, topology revision and sector-update
count unchanged; querying missing sectors returns `unknown`. The six-biome
probe checks the physically authoritative final certificate where the cut
becomes one stroke. Negative results are retained above.

The final candidate WASM passed 13 focused Node tests covering crop groups,
paid closed rings, destruction, automatic doors, worker return, read-only cut
queries and the structural closure check. The standalone C++ cut test passed,
as did the web build. A full `npm test` run was started, reached at least 910
passing cases including several 300-night postgame probes, and was stopped to
avoid spending further time on unrelated long-running QA. It is **not**
reported as a passing full suite. The production web build continues to
package the existing checked-in WASM, since this prototype is not wired into
the playable game.

No worker-gate or all-species equivalence claim has been made for the proposed
cut. Exact-proposal physical equivalence, repaired walls, nested enclosures,
worker isolation, natural-join certification, sector streaming and a sustained
campaign performance comparison remain open. The prototype is intentionally
disconnected from the virtual player's decisions, so `Game.tick` and campaign
results cannot be credited with its microbenchmark speed. The full baseline
construction and physical rules remain available and unchanged.

## Convex-hull-first experiment

`cropClearanceHull` builds a cheap convex candidate from the crop coordinates
and a 2.5 m square clearance around each crop. It does not inspect terrain or
claim a physical closure. The same read-only Sabana/712 day-3 checkpoint
(`7b7033894dee269d4bf04cb074f1372ef2f84ef280446150cd5f2e2331cb6966`,
66 living crops) was evaluated in old/hull/cut/cut/hull/old order; raw results
are in `sabana-hull-vs-cut-d3.json`.

| Candidate | Time | Modules / price | Physical result |
| --- | ---: | ---: | --- |
| Existing rectangular advice | 23.71 / 24.08 s | 35 / 350 coins | `unknown`, one omitted piece |
| Convex hull + normal quote | 310 / 319 ms | 29 / 290 coins | Open wall face, one omitted piece; not certified |
| Local native cut | 8.54 / 4.19 ms | 11 / 110 coins **estimated** | Two arcs, four joins; no buildable quote or certificate |

The hull is a useful first candidate but fails in this obstacle case. Running
min-cut only after a placement failure would also miss cases where a valid
convex ring is unnecessarily expensive because existing walls or natural
barriers could replace modules. A future hybrid should first quote the hull,
then consult the local cut when the hull is physically incomplete **or** its
actual price warrants looking for a cheaper alternative. The final decision
must compare buildable, worker-accessible, physically certified proposals;
the cut's 110-coin estimate cannot yet be counted as savings.

## Atomic multi-arc quotation

The game quote now accepts a list of wall strokes, deduplicates repeated
modules and prices/places automatic gates for the combined proposal. It is
unused by normal gameplay. Tests cover an all-wall ring built from two arcs
and a two-arc closure against a building; both preserve one gate and worker
access, and the paid transaction survives save/reload.

On the identical 66-crop Sabana/712 day-3 state, quoting the **raw two-arc
cut** produced 11 placeable modules at an actual price of 110 coins in
142–151 ms including preview. No module or crop was omitted. However, the
automatic gate planner found **zero gates** and the native protection result
was `unknown` for four profiles (`protected` only for lion). The open arcs and
their four joins still need a physical barrier-continuity witness. This is a
real quote, **not a certified or purchasable protected enclosure**. The raw
ABCCBA-style run is saved in `sabana-multiarc-d3.json`; it retains the prior
negative hull and baseline results. The earlier 110-coin estimate is now
confirmed as the module quote for this candidate, but not as an achievable
defensive saving.

A cut-only rerun on the same serialized-state hash records the exact contour,
four exposed terminal coordinates and the placed-module positions in
`sabana-cut-terminals-d3.json`. The quote now carries per-stroke module slots,
so a junction inspector derives its terminal coordinates from the **placed
modules** and refuses missing pieces instead of trusting the ideal grid line.
This does not establish obstacle continuity or a worker entrance. On this
checkpoint the four placed endpoints happen to equal the ideal endpoints.
One contour is only the 1 m segment at
`(72.5, -10.5)`–`(72.5, -9.5)`; the other runs from `(75.5, 5.5)` to
`(90.5, 10.5)`. Both are open arcs. Counting the 11 quoted modules is therefore
not a closure test: the unbuilt intervals must be accounted for by continuous,
impassable terrain or structures, and the combined proposal must still provide
a worker gate or another proven worker access. The cut-only mode
(`--cut-only`) removes the older advice arms from the diagnostic run; its
elapsed time is not an AB/BA comparison and is not cited as a speedup.

The diagnostic now also reports nearby existing solids, terrain probes and a
worker route for one representative crop from its center. The four endpoint
distances to the nearest existing wall/building footprint are **1.28, 1.30,
0.96 and 1.46 m**, below the 1.70 m smallest-animal diameter. The new
read-only `spatial_static_object_clearance` C++ query returns the same four
values from Wild Engine's existing barrier, polygon and resident-prop data.
It excludes terrain and returns NaN outside resident chunks. Tests cover
animal-passable barriers, solid wall insertion/removal and polygon
insertion/removal. These are conservative point-to-surface measurements from
placed wall ends, not complete enclosure certificates. No terrain obstruction
was observed within the 3 m radial sample and there was no existing gate in
this state. The sampled
worker route was reachable both before and during the wall preview, so an
automatic gate is not automatically necessary for that route. Other crops and
routes were not checked. In particular, four animal profiles still report
`unknown`; endpoint proximity cannot establish continuity of the *intervening*
barrier or certify the whole enclosure. The extra QA probes make this cut-only
run unsuitable for timing comparisons.

A further read-only probe of the candidate preview examined a 3×3 grid around
all 66 crop positions in each of the five animal profiles. Every crop had at
least one cell whose native component was sealed; none of these neighborhoods
had an uncertified cell. The existing `cropProtection()` classifier nevertheless
reported `unknown` for four profiles because its direct physical connector
from the *exact crop coordinate* to a nearby cell failed on some crops. With
the wider 3×3 diagnostic, the counts without any physical connector were 10
(warthog), 7 (hyena), 9 (buffalo), 0 (lion) and 14 (rhino). A sealed neighbor
does not prove that the crop itself is physically enclosed, nor does an absent
connector prove an exterior route exists. These results localize the cause of
the conservative `unknown` and justify a focused closure/interaction test
before changing production classification. They do not establish all-species
protection or a campaign saving.

The same preview also ran a deliberately **QA-only** continuous-motion probe
across each of the 21 proposed cut edges. Five positions per edge were tested
for every animal species using Wild Engine's ordinary physical step check.
Before the proposed walls, the numbers of passable crossings out of 105 were
100/102/101/102/92 (warthog/hyena/buffalo/lion/rhino). With the 11 modules in
the preview, every profile returned **0/105 passable crossings**. This
before/after control shows that the proposed modules block the sampled open
frontier rather than merely coinciding with an already impassable line. The
525 after-proposal probes are diagnostic work, not part of the proposed fast
planner. Samples cannot prove that no continuous corner route exists between
them, nor certify every natural obstacle chain or worker interaction. The
candidate therefore remains experimental despite this strong local evidence.

The quoted Sabana plan suppresses **no existing object**. This matters because
measuring a wall end against an obstacle that the build itself removes would
produce a false join. The open-arc inspector now conservatively returns
`unknown` for any quote with suppressed static objects until clearance can be
re-evaluated against the post-build geometry without counting the new wall as
its own supporting obstacle.

## Continuous boundary audit (experimental)

The native cut now exposes the full boundary of its crop-side grid component,
including the portions touching impassable cells, rather than only the 21
connections selected for new wall modules. The frozen Sabana state has 144
one-metre boundary segments. A read-only QA certificate examines the quoted
preview with Wild Engine's point-to-static-solid clearance. For each segment,
the 1-Lipschitz property of distance to solids bounds the maximum clearance
between sampled endpoints; uncertain segments are bisected, with fixed depth
and query budgets. Only a boundary covered throughout by static solids at the
smallest animal radius may pass. Terrain-supported segments, missing geometry
and exhausted budgets remain `unknown`. This is a conservative continuous
test, rather than a larger set of crossing samples.

The Sabana proposal remains **unknown** as an actual enclosure. The first
unproved segment runs
between grid cells `(74,-11)` and `(74,-10)`; its boundary endpoints are
`(73.5,-10.5)` and `(74.5,-10.5)`, with static-solid clearances 0.78 and
1.28 m. The latter exceeds the smallest animal radius of 0.85 m. Five native
crossing probes along that segment fail for all five species, but in every
probe the sampled outside starting point is already unstandable. These are
not witnesses that the intervening boundary itself is covered by an obstacle;
they begin within the expanded footprint of an existing wall. Shorter native
steps placed directly across the abstract boundary **do** cross that segment
for hyenas, buffalo and lions. Scanning all 144 boundary segments at their
midpoints finds 49 locally passable segments for hyenas, 44 for buffalo and 53
for lions; warthogs and rhinos have zero in this sampled scan. This disproves
the claim that the cut's entire crop-side grid boundary is physically blocked.
It does not by itself prove a complete exterior-to-crop route, because a locally
passable segment might lie in an isolated exterior pocket. The proposed 11
modules therefore cannot be treated as a certified enclosure or a demonstrated
110-coin defensive saving. The raw details, including the same serialized state hash, are in
`sabana-cut-terminals-d3.json`. This audit is QA-only and is not part of the
normal planner's cost.

The counterexample is caused by a one-metre cell whose centre is unstandable
within the radius of an existing wall while part of the cell face is passable.
The discrete min-cut treats the whole cell as a barrier. A later prototype must
use a conservative physical abstraction: refine the local grid near mixed
joins or mark cells/edges as open whenever a passable part is possible, then
convert the resulting frontier to modules and validate it. Checking only the
two or four arc endpoints is sound only if the intervening wall/obstacle chain
has already been established as continuous. The minimum cut itself remains
viable as a search strategy, but this particular 1 m connectivity graph is not
yet a sufficient physical certificate.

### Conservative face-graph prototype

An isolated `lazy_local_crop_cut_conservative` variant keeps the same local
min-cut but no longer equates an unstandable cell centre with a completely
blocked square. Every resident square is provisionally open. An adjacency is
removed only if the native distance to animal-solid geometry proves the
*entire shared face* forbidden to the smallest animal. It uses the same
1-Lipschitz bound and bounded subdivision as the QA certificate. Natural
terrain without such a proof stays open in this graph; this may overbuild but
cannot claim a water/cliff closure that it has not demonstrated. Missing
resident sectors still return `unknown`. This is an optional experimental
entry point, not the distributed navigation graph or production advisor.

On the identical Sabana/712 day-3 serialized state, the variant finds 27
crossings and quotes 14 placeable modules for **140 coins**, with no omitted
pieces and no suppressed static object. Its quoted preview gives a continuous
static-solid certificate for **all 142 segments** of the crop-side boundary;
the separate native movement spot-check found **0 locally passable midpoints**
for each of the five species. All 66 crops were reachable from their work
centre in both directions in this preview. These are stronger, distinct tests:
the continuous clearance bound, rather than the midpoint samples, establishes
that particular boundary condition. The game's existing group classifier
still says `unknown` for four species because its crop-coordinate connector
cannot anchor some plants; it reports `protected` for lions. Therefore this
prototype is not yet wired into the bot or described as fully game-accepted.
The raw diagnostic is `sabana-cut-conservative-d3.json`.

An old/conservative/conservative/old comparison on that same state and final
candidate WASM recorded native cut times of 6.79/1.61 ms versus 8.73/7.72 ms,
respectively. The physical quote/preview costs were 129–161 ms versus
176–179 ms. This is a measured cost for the stronger abstraction, not an
overall campaign speedup. The four-arm data are in
`sabana-cut-conservative-abba-d3.json`. The output still needs tests with
automatic doors, multiple centres, sector streaming, construction/destruction
events and other biomes before it can replace the current advisor.

The existing six-biome *single-crop synthetic* workload was then rerun with
the conservative variant, using the original sites and the same candidate
binary. Sabana, Manglares, Gran Río, Volcanes and Desierto each quoted 9
modules/90 coins with no omitted piece, and their 1 m crop-side boundaries
passed the static-solid certificate. These corner sites have similar local
geometry, so five successes are not five independent complex farm shapes.
Gran Cañón produced three arcs, quoted only 3 modules while omitting 2, and
its boundary remained `unknown`; both omitted pieces tried to build over
water/lava at `(-4.5,-5.5)` and `(-4.5,-7.5)`. This is a concrete requirement
for the next iteration: traversable but unbuildable terrain faces must not be
priced like ordinary wall positions, while provably impassable natural faces
can contribute to the closure. This is a **failed proposal**, not a 30-coin
enclosure. The raw old/cut/cut/old runs are retained in
`six-biomes-conservative.jsonl`.

This synthetic workload cannot prove worker access: its worker route from the
village to the test crop is already unavailable **before** the preview in all
six cases, and remains so afterwards. It is useful for comparing physical
frontiers and quote legality, not for accepting a worker-safe enclosure. The
real Sabana/712 day-3 checkpoint above is the separate positive 66-crop
round-trip access test. Other real checkpoints and dynamic changes remain
pending.

### Negative result: fluid-weighted graph cut

An isolated weighted variant gave faces covered by water or lava a capacity
of 1000 rather than 1. The face classifier used Wild Engine's resident fluid
level at 15 points along and across the face; the normal build quote remained
the final legality check. On Gran Cañón/712 at the same fixed crop site, the
weighted cut moved some edges and reduced omitted wall modules from two to
one, but did **not** produce a legal enclosure. At local box margins of 12,
20 and 28 m, it returned the same 9-edge cut with flow 2007, quoted 5 modules
and omitted one over water/lava; the static boundary stayed `unknown`.
The unweighted conservative variant returned the same 8-edge cut at all three
margins, quoted 3 modules and omitted two. The larger boxes added work without
removing the construction failure. The six raw measurements, source-file and
experimental WASM hashes are in `canyon-fluid-weighted-margin.json`.

This is evidence against retaining a simple fluid penalty as the solution.
The graph must distinguish naturally impassable terrain from traversable but
unbuildable terrain and choose constructible wall placements when turning a
cut into modules. Merely making an illegal face expensive cannot guarantee a
legal cut when the local topology still requires crossing such faces.
The weighted function was removed from the active prototype after this
measurement; its exact source remains in commit `46169800` for reproduction.

### Local construction and destruction regression

The focused WASM test now encloses a known resident seed with four native
solid barrier segments. The conservative cut shrinks when the loop closes,
grows when one segment is removed, and returns exactly to its original edge
and boundary lists after the remaining segments are removed. These queries
run against the same session and do not mutate the serialized game state.
This demonstrates that the prototype reads current native obstacles rather
than returning a stale cut for this local sequence. It does **not** yet test
the full game construction event path, sector unload/reload or save/restore.

A second regression uses the frozen Desierto/983 day-15 state and the actual
`Game.buildWallChain()`/`Game.removeWall()` commands through the spatial
navigation adapter. The local native cut at `(70,-12)` has six proposed edges
before the paid five-module stroke, zero after construction, and exactly its
original edge list after all five modules are removed. At least one removal
reopens the cut. This tests the confirmed game-to-WASM wall mirror rather than
only direct native barrier insertion. Serializing that built state and creating
a fresh spatial session reconstructs the same zero-edge local cut. It is a
local graph response, not a certificate that every crop in that compound is
protected. Unloading and reloading sectors during the same session remain
untested.

This also explains why checking only the four exposed wall ends is insufficient
for this candidate: a mixed wall/building/terrain closure needs evidence that
the intervening obstacle chain stays impassable. A self-closing wall face with
a valid automatic worker gate can use a cheaper structural certificate; only
mixed joins and unsupported intervals need this focused audit. The hybrid
convex-hull/min-cut selection remains disconnected from normal play until a
physically certified and worker-accessible candidate is available.

## Adoption boundary

If this approach continues, turn the multi-stroke quote into a validated
plan with stable module IDs, a module-chain closure check, focused terminal
clearances against native solids and a worker-access witness. Compare the
resulting certificate with the game's five-profile physical preview on the
**same** proposal during validation; the expensive preview need not remain in
ordinary planning after agreement is established. Only then compare full
decision time, module count, actual cost and campaign outcomes against the
existing planner. The old rectangular proposal
may remain a fallback for regions the new local cut cannot handle, but neither
should be called protected before physical validation. No production code is
deleted by this experiment. After adoption, rectangular margin search and the
repeated provisional previews used solely to *discover* a boundary would be
the main candidates for removal; final quote/build, automatic gates and
physics must stay.
