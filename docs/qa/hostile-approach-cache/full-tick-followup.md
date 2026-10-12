# Full native tick follow-up (supersedes initial aggregate acceptance)

The initial margin-48 reverse warming candidate reduced 256 selected negative
queries but **did not complete the full native tick in reasonable time**.
Neither did simply changing it to reverse margin 64. Forward warming alone
still made thousands of pointless individual queries. These negative diagnostic
attempts are retained under `full-tick-negative/`; their owned QA processes were
deliberately stopped for disproportionate computation, not native defeats.
Original good/normal campaign processes and source files were not stopped or
modified by those diagnostic terminations.

The full-tick reproduction calls `Game.tick(state, .05, nav)` on a clone of the
retained night-9 mid-tick diagnostic state. It includes workers, events, all 11
animals, reservations and target selection, not merely a chosen list of paths.
It does not resume a virtual-player campaign or provide a campaign checkpoint.

## Revised experimental candidate

1. Warm a forward margin-64 exhaustive region from the actor after an original
   reverse margin-32 failure; discard any successful warming route.
2. Do not spend the single warming attempt on an invalid service endpoint:
   that query exits without generating any exhaustive component witness.
3. Reuse exhaustive bounded regions in reverse only after verifying every
   incoming grid boundary edge. Directional collision sampling is not assumed
   symmetric. All destination connectors must belong to the witnessed region.
4. Use that same bounded proof to reject a whole service zone, only when every
   possible original service corridor fits inside the witness and no possible
   service connector intersects its reachable nodes.

The zone/group is used for **accessibility**, never attack exclusivity. No
reservation code changes. Worker portal paths keep their original proof rules.
Boundary, budget and incomplete-search failures do not imply global isolation.

The revised reproduction completed in **6,811 ms**. A counted repeat completed
in **6,670 ms**, with **17 actual approach calls** in total rather than thousands
per animal, and the entire input/output hashes matched the first run. The 11 animals
remain alive and retreat with their original unused attack budgets because this
specific fixture has no eligible reachable target under the native corridor
rules. That is a diagnostic result, not an approved balance outcome. Clock
advances exactly .05s, RNG and the complete resulting state are retained.

`native-tick-group-valid-witness-state.json.gz` and its report preserve the output
for exact comparison against the original. The baseline has not completed yet;
**no full-tick semantic equality, total speedup, campaign adoption, mobile
acceptance or main integration is claimed** at this checkpoint.

The original `ffa18f2e` navigation module is retained, with its original URL
preserved by a loader so relative imports and native collision modules remain
identical:

```sh
node --loader ./tools/hostile-navigation-baseline-loader.mjs tools/check-hostile-native-tick.mjs baseline fresh-control --trace
node tools/check-hostile-native-tick.mjs candidate fresh-candidate --trace
```

Compare the full resulting state JSON and its hashes, not only animal statuses.
Baseline measurements can be very expensive and must preserve their start
receipt and terminal observation if technically stopped.

The initial test expectation for a synthetic one-way connector was corrected:
its goal had included the outside connector, so the conservative early return
was correct and no incoming-boundary memo had been written. The corrected test
places that incoming edge outside the goal connector stencil and verifies it is
explicitly rejected. The original failing log is retained.

77 targeted regression tests pass. This includes incoming directed edges,
partial goal coverage, whole-zone containment, intersecting possible service
origins, radii, worker portal exclusion, invalid first service points, cache
epochs, positive detours, body sweeps and gates across all biome/culture pairs.

## Center hull follow-up, 2026-10-12

The center approach certificate now encloses its authored footprint and the
actor clearance before rejecting an approach region. A crop-sized focus circle
could exclude a valid center boundary approach. The new regression constructs
exactly that case. The 468-source-input guard passes.

Six complete native reservation fixtures (1/2/5/12 animals, connected walls,
center-only) retain identical per-step and final state hashes against the
archived original navigation: 1,973 ticks in all. A persisted night-16 raid
replay runs 2,278 physical ticks including save/reload, movement and all exits;
its final full state hash is identical. Its isolated runtime was 2,432 ms
(original) and 2,517 ms (candidate), so this ordinary raid is not faster.

The hostile night-9 mid-tick candidate completes in 8,060 ms after the hull
fix. The original control exceeded 38,400 individual approach calls and did
not complete during roughly an hour of isolated runtime; its trace was
retained before the owned QA process was stopped. The baseline did not produce
an output state, so semantic equality on this pathological tick and a
quantified total speedup remain unproven. This branch is experimental and
must not be merged on this evidence alone.

The sparse checkout omits `docs/qa/populated-raids/*.json`; those six fixture-
dependent raid-navigation-warmth tests fail ENOENT locally. The 22 tests
covering changed navigation, reservations, source guard and comparator pass.

## Navigation cache probes (diagnostic only)

A CPU profile of the completed candidate tick attributed ~2.07 s of sampled
self time to `TerrainField.lattice` and ~0.58 s to slope computation. The
frozen input and complete output SHA-256 remained unchanged across four
isolated, opt-in cache probes:

| Probe | Single tick | Output hash equal |
| --- | ---: | :---: |
| Current branch | 7,466 ms | reference |
| Larger height-cache capacity (100,000) | 6,478 ms | yes |
| Numeric lattice keys (12,000 capacity) | 5,007 ms | yes |
| Numeric keys + 100,000 capacity | 4,411 ms | yes |
| Existing last-tile adapter (48 × 32² cells) | 4,231 ms | yes |
| Fractional walkability cache 65,536 (from 8,192) | 5,213 ms | yes |
| Last-tile adapter + larger fractional cache | 3,787 ms | yes |

All timings are isolated single-process observations under a shared but
uncontrolled Windows host, not a statistically accepted speedup. The
fractional-cache source was restored after the probe; the tile adapters were
installed only through ignored `.cache` preload scripts. No production module,
recipe, policy or live campaign received these experimental changes. Even
3,787 ms is unacceptable as a gameplay frame, so the hundred-night campaign
remains paused pending a way to distribute or avoid synchronous cold searches.
