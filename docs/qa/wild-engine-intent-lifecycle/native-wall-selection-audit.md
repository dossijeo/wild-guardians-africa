# Native wall-target selection: measured migration boundary

The experimental intent planner already selects and leases accessible crops in
Wild Engine. When its crop result is `blocked` or `unknown`, `raids.js` still
uses `targetForImpl()` for wall selection. This is a transitional responsibility,
not yet native ownership of the animal's full attack intention.

## Frozen baseline

The archived `campaign-14-transient-leases.json` replay (Sabana/712, source
`2e03bc7d`, WASM SHA-256
`2d4d5031487245a2930a630f2a3b200d48cb389722435ef78033861c007c51ba`)
recorded 2,151 target selections and 19.141 s in selection. Native crop planning
returned 1,227 `blocked`, 181 `found`, 159 `occupied` and one `unknown`; the
transitional selector ran 1,227 blocked and 583 unsupported fallbacks. It built
the JavaScript wall-portal graph 224 times (2.138 s) and produced 1,519
fallback `unknown` outcomes. These counts establish a sustained cost and a
remaining ownership split; they do not prove that every fallback was redundant
or that moving the same loops to C++ would be faster.

## Existing authority and missing step

`spatial-intent-state.cpp` already maintains live crop groups, species-specific
attack sites, live wall targets, and native intention dependencies. The lazy
sector graph supplies weak-region IDs, sealed-enclosure status, connectivity,
and route planning under the selected movement profile. The JavaScript selector
still samples each wall's two sides, builds a graph of wall edges between weak
regions, follows that graph toward a protected crop region, and checks a final
reachable attack position. This wall-to-region association has not yet been
stored in the native read model.

The native target projection previously omitted `baseScaleX` and gate depth.
Commit `3ef66bd7` now derives width and depth from `wallCollisionFrame()` and
projects both into the read model. A directed repair-route regression checks a
rotated scaled gate. This is a physical-geometry prerequisite; it does not move
wall target selection into WASM.

## Native integration contract

The next implementation should derive wall-side region edges from the same
confirmed wall targets and lazy-sector topology. Index them by movement profile
and relevant topology revision, recomputing on wall/gate/breach or resident-sector
changes, never on an ordinary hit that leaves collision unchanged. For each
blocked crop group, it should distinguish a wall-separated reachable attack
side from a purely natural barrier. An `unknown` crop or wall-side region must
remain pending; it cannot justify an attack or a negative cache entry.

The native planner must preserve the game's crop-first priority, eligible
structure alternatives, target leases, attack-site leases, deterministic
tie-breaks, and committed damage frames. A found wall proposal needs the wall
ID, a physically valid approach, a reservation and a pinned route in one
revision-checked operation. JavaScript should execute the confirmed attack and
animation, without rebuilding a per-crop or per-wall search. Existing
`targetForImpl()` remains a transitional reference until these properties and
sustained campaign costs are verified, then its replaced logic should be
removed rather than left as a competing planner.

## Required differential fixtures

- Sabana day-ten unresolved crop group that currently exposes wall
  `structure-9100`: `unknown` must not be silently converted to `blocked`.
- Closed rings with one and five animals, plus a newly opened breach that
  causes a tactical change only after the committed strike frame.
- Natural-only barriers, mixed rock/river/wall perimeters and multiple wall
  access sides: do not nominate a wall without a reachable physical attack
  position or hide an alternative passage.
- Rotated and scaled gates, ruined modules, sector unload/reload, and save/load
  during a leased attack.
- Frozen 14-night replay and longer multi-biome campaigns: compare target
  choices, reservations, damage timing, rejected plans, native/JS calls,
  `Game.tick`, memory and terminal outcomes. Different valid routes are
  acceptable; invalid physical movement or changed combat rules are not.

## Wall-side graph prototype (source `314c5f9e`)

The first native prototype projects each confirmed intact or collapsing wall
into directed weak-region edges for the selected animal profile. It reuses the
projected wall width, depth and yaw and the native short physical connectors.
Sides with missing resident-sector data are omitted as unknown; an omitted
edge is **not** a certificate that no wall is attackable. This diagnostic API
does not select a target, reserve an approach, or change raid behavior. It is
intentionally rebuilt per query until the differential tests establish the
correct invalidation boundary for an incremental native index.

The pinned Emscripten CI build and native-intent suite passed for this commit
([run 38827830760](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38827830760));
the web validation also passed
([run 38827830634](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38827830634)).
The candidate WASM SHA-256 is
`01da4880bfca294eb3cd2735d30cf3adf2fd7cbd3a14f41eca0ae22d9841474a`.
On that exact binary, the focused closed-ring test found native wall-side
edges with distinct regions and then completed the one- and five-animal raids
against real walls. The frozen day-ten `unknown`-crop fixture also retained
its reachable wall selection. These tests prove the prototype exposes some
valid edges; they do **not** yet prove that it covers every eligible wall or
improves campaign runtime. The next step is an AB comparison of native and JS
candidate sets, including breaching, natural obstacles and missing sectors,
before wiring native wall selection into the confirmed attack planner.

An additional local differential check on that same candidate now asserts
that at least one wall actually hit in the closed-ring raid occurs in the
native portal rows, and that the frozen day-ten selector's `structure-9100`
also occurs there. Both checks passed. This is candidate inclusion for two
fixtures, not full candidate-set equivalence; the live raid still uses the JS
selector and its physical approach route.

The same candidate passed two topology-transition checks locally. After a
confirmed wall ruin, the ruined wall IDs disappear from the native portal
rows while the other wall attacker can reconsider the breach. When the
central chunk is removed, no wall-side portal is certified; reloading that
chunk restores the rows and the raid still completes. These checks cover
invalidations at the diagnostic query boundary, not an incremental cached
portal index or every combination of natural barriers and wall materials.
