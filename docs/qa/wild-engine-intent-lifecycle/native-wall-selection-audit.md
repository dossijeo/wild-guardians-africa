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

## Region-to-crop perimeter candidate query

Source `21019962` adds a second read-only native query. Given the animal's
continuous position, movement radius and an indexed crop-group ID, it uses
the existing interaction-region index and wall-side graph to return the
first wall crossings on a shortest sequence of region edges toward a sealed
group. A group with unresolved residency returns `unknown`; a group already
in the animal's region returns `inside`. It does not commit a reservation or
run a route to the proposed attack side. This keeps target selection unchanged
while the geometry and priority rules are compared.

Pinned Emscripten [run 38828677286](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38828677286)
passed with candidate SHA-256
`5ed63cbf457846ef93554cd65c483ef80de5d9929201c98c0ac3fb5ffe6210ad`.
On the frozen Sabana day-ten state, both native crop groups returned perimeter
candidates, including `structure-9100`, the wall chosen by the existing
selector. The query returned many walls of the same enclosure. The next
planner stage must validate physical reachability and existing military
priority before choosing one; this candidate inclusion alone does not prove
that every returned side is reachable, or that native selection is faster.

### Portal-graph reuse benchmark

The first native perimeter query rebuilt all wall-side edges for every crop
group. Source `2d742303` now retains these edges by movement profile, radius,
native topology revision and confirmed wall revision. Ordinary crop changes
do not invalidate them. A wall construction/removal or status change, and a
sector unload/reload, do. The directed ring test checks one build, a repeated
cache hit, and rebuilds after unload and reload. The pinned native-intent
[run 38829308432](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38829308432)
passed; its candidate SHA-256 is
`c554dde437af31f2196352986ad5f5684300e69f416ac723dcce5346ca044a8b`.

An ABBA microbenchmark on the same frozen day-ten state, with 100 warm
two-group queries in each fresh Node.js process, returned 60 candidates in
both versions. Median warm time was 7.45/7.96 ms without graph reuse and
0.125/0.125 ms with reuse; the cached version built the portal graph once
per run. First-query times were 20.15/22.18 ms and 17.31/17.64 ms,
respectively. Exact outputs and WASM hashes are in
`native-wall-perimeter-abba.json`; the executable benchmark is
`tools/experiments/benchmark-native-wall-perimeter.mjs`. This measures only
native candidate lookup. It does not establish a reduction in `Game.tick`,
overall raid cost or campaign wall time; those require live planner adoption
and sustained campaign comparisons.

### Opt-in wall attack proposal

Source `88a5d5c3` adds a native wall proposal that sorts certified first-wall
crossings, checks transient mobile and target reservations, finds a native
route to a physical attack side, and confirms a route handle plus attack-site
lease in one call. This API is not called by live `targetFor()` yet. Pinned
native-intent [run 38829917674](https://github.com/dossijeo/wild-guardians-africa/actions/runs/38829917674)
and web validation passed; candidate WASM SHA-256 is
`85f1fe70b60d4180ea7cb672b5fc9de2f8070336a1b69d4c0b3895c9ae4ba299`.
The closed-ring fixture obtains one wall proposal and cancels its lease before
the ordinary raid continues. On the frozen day-ten fixture, the native
proposal chose `structure-9100` with one route query; its waypoints passed
the JS physical segment checks. A synthetic concurrent JS-held lease of that
wall then prevented the native proposal from selecting it again. The bridge
now exposes this operation and projects live wall leases along with crop
leases, while the existing selector
remains authoritative. The entire native raid suite (10/10) and web build
passed locally with this candidate. These fixtures do not establish policy
equivalence or campaign performance across species and biomes; the proposal
needs differential tests for natural barriers, multiple access sides, shields,
simultaneous reservations and committed attack animations before activation.

### Live opt-in technical pilot

The native wall proposal is now available behind `nativeWallPlans` for raid
selection when the native crop plan is `blocked` or `unknown`. The default
remains off while the sustained comparison runs. The opt-in path rejects
reserved targets, reserved or occupied attack sites and physically invalid
sites before accepting the native lease, and cancels rejected proposals.

A same-seed Sabana/712 `good` comparison completed seven nights in both
modes with verified raid evidence and no technical failure. Both modes had
identical serialized state hashes through day five. The opt-in mode made 22
native wall proposals from night six onward, all `found`, and spent 670 ms
in raid target selection versus 1098 ms for the control. Total elapsed time
was approximately 100 seconds in both modes. On night seven it lost eight
crops versus seven in the control and ended with 118 versus 119 living crops;
both ended with 642 coins. Night-seven attacks differed (21 versus 23 wall
hits) as navigation and target choices diverged. This is a technical smoke
test, not evidence of better balance or sustained performance. The reports
are retained under `.cache/native-intent-38799294071/` and were generated
from working-tree code immediately before its commit; the report's `source`
field is the prior clean HEAD, while `inputHashes` preserve the key source
contents. Clean-source fourteen-night campaigns are the next comparison.

The clean-source Sabana/712 `good` paired fourteen-night run completed both
variants without a technical failure, and both raid reports are `verified`.
With native wall selection enabled, the campaign took 279.42 seconds, spent
11.34 seconds in raid target selection, and ended with 80 living crops and
573 coins. The otherwise identical control took 300.26 seconds, spent 13.91
seconds in selection, and ended with 20 living crops and 723 coins. The
native path recorded 220 wall proposals (`found` 144, `occupied` 76). Both
campaigns had identical end-of-day hashes through day five, then diverged
under real night-six pressure. Night seven favored the control by one crop;
subsequent attack and defensive trajectories favored the native selector in
this seed. Different terminal cash reflects these divergent trajectories and
does not by itself prove a better economy. These are one paired full-run
sample, not a statistical balance result or proof across biomes. Raw reports:
`campaign-14-native-wall.json.gz` and `campaign-14-wall-control.json.gz`
in this QA directory; each contains the full original JSON report, including
source/input hashes, per-day states, raid evidence and negative outcomes.

### Gran Cañón cross-biome control (negative result)

With the same clean source and WASM binary, Gran Cañón/123 `good` was run for
up to fourteen nights in both modes. Native wall selection suffered a real
economic defeat at dawn of day twelve after eleven completed nights, with
zero living crops, one operational center and 32 liquid coins. The control
survived twelve nights and lost at dawn of day thirteen, also with zero
living crops and one center, retaining 21 coins. Both raid reports were
`verified`; neither result is a simulator failure. The native variant took
203.03 seconds and 7.18 seconds in raid selection, while the control took
196.14 and 7.38 seconds respectively. The new mode is thus neither faster
overall nor more survivable in this paired canyon run.

The crop planner returned `unknown` 795 times with native wall selection and
790 times without it. The wall proposal itself returned `unknown` 795 times
and only `found` six times. Most `unknown` diagnostics had no first crop
candidate and no interaction-site trial, indicating that the unresolved
connectivity predates wall-route selection. Repeating a wall proposal on the
same unresolved state is redundant; `unknown` must not be treated as proof
of a closed, attackable perimeter. Investigate sector-residency and event
invalidation before considering default activation. The opt-in remains off.
Full unedited reports are `campaign-14-canyon123-native-wall.json.gz` and
`campaign-14-canyon123-wall-control.json.gz` in this directory.
