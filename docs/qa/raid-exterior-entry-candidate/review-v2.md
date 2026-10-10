# Candidate V2: physical coverage improved; cold-spawn gate still OPEN

Base remains main9f0f65ed, isolated `codex/raid-exterior-entry`. No balance, damage, compositions, wages, money, clock, movement radius or target-reservation rules changed. There were no campaigns, CI/GPU runs, PR or promotion. Historical fixtures and all original negatives remain separate.

## Open control and independent closed natural fixture

The original paid native Canyon U[-25,-8]→[-40,-8]→[-40,8]→[-25,8] is **physically open**, despite creating an automatic gate. A bounded49-point diagnostic finds36 walkable points for radius1.1; many have direct native exterior escape, including(-39,-6)↔(-44,-6). Its original full snapshot/probes are retained byte-exact, along with the original d579 regression-test blob and negative receipt. Therefore the live test now checks the open control rather than fabricating a closed region. This is a documented refutation of its original premise, not a waiver of natural-boundary coverage.

Separate ordinary paid construction uses [[-22,24],[-34,24],[-34,36],[-22,36]] in the same native Canyon/Mapungubwe seed712. It costs160 and creates one gate. Point(-30,26) is walkable for actual warthog radius1.1; exterior point(-40,26) is also walkable. The native route returns null and `Navigation.closedRegions` contains the starting grid node: the exhausted search proves a finite native grid component, rather than merely reaching the corridor/time limit. Its protected face excludes interior entry and selection supplies a nearby exterior entry with full reversible escape. The test log retains the paid snapshot hash, node count and exact entry/exit.

Before selecting this independent fixture, bounded previews were recorded as observations: moving the original U north/south omitted many pieces; narrowing its width still left endpoints away from the cliff. Native terrain probes identified the actual cliff side. These are fixture exploration under unchanged seed/terrain, not rerolled campaign controls or changed farming policy. The retained control is not replaced by the new closed case.

## Runtime corrections

- `createRaidExteriorQuery` scans geometry/revision once per selection. `chooseRaidEntry` passes that same query to camera, nearFarm and boundary fallback; candidates/actors only look up radius-specific cached polygons. A warm query does not construct wallLayout. Tests show200 repeated lookups retain one structure scan. Direct geometry edits, topology/radius/epoch changes and a replaced terrain field invalidate ownership.
- `exteriorRaidEntry` now checks finite/whole count, active bounds including actual footprint, native walkability, pairwise entry-body separation and both directed escape segments. It still checks protected-region membership. Interior, blocked wall, out-of-bounds, overlapping bodies and reverse-escape failure replies are rejected.
- The actual spawn keeps the original RNG draw/allocation and falls back to ordinary native selection when a prepared reply fails validation. Six-biome prepared/direct serialized post-spawn parity remains exact.

## Native traversal and advanced context

A single warthog begins at exterior(81.4,12.1), uses ordinary `Game.tick`, makes2 actual wall hits, and finishes `gone` exactly at exterior exit(81.4,15.1). The fixture performs an ordinary save/reload after.25s, retaining spawn/exit and saved state exactly; elapsed ends5.25s and paid balance525 stays unchanged. No worker, ledger, path, position or attack result is forced. This is one narrow physical raid fixture, not group12 physical traversal, a campaign or proof of balance.

The first traversal test requested reload after5s but its active raid had already ended, so the fixture assertion failed. That negative observation is retained explicitly; no missing original stdout is fabricated. The corrected case reloads during a recorded active interval and keeps arrival/hits/exact exit assertions.

The unchanged, legitimately funded historical advanced farm is restored under candidate main Navigation strictly for geometry/entry checks:103 paid walls,865 living crops,5188 total historical plants. Original gzipSHA256 `1b0f1a153aaf9c7adcb91b394d232886016124316570f3e90df01bb280bb4a0b`. No command, clock, balance or simulation state changes occur during the query. Cold geometry233.8768ms; one warm query plus200 cached lookups.3347ms; native camera entry8.5507ms. This does not transfer historical economic acceptance to main and is not a GPU/frame or statistical performance claim.

## Explicit remaining performance/architecture blocker

Current `spawnRaid` calls `exteriorRaidEntry` **before** `warmRaidNavigation`. The protected graph cache is private to each Navigation, so a worker computes one graph while the first main-thread validation can compute another cold graph. The advanced233.88ms observation is too expensive to promote in spawn. Shared per-selection lookup fixes repetition, not this first cold calculation or cancellation.

Next design must examine transporting prepared geometry with complete input/revision/owner proof and adoption into the exact current navigator, followed by cheap independent bounds/walkability/separation/reversible-escape checks. Merely accepting a keyed arbitrary graph is insufficient. Changes to structure geometry, terrain/site/profile/suppression and radius must invalidate stale ownership; worker failure/cancellation must not install a partial graph or disguise unbounded synchronous fallback. No such transfer has been implemented yet; root review is required before choosing architecture.

Further group12 physical traversal, all natural arrangements/open rivers/gate animation states, worker-unavailable/cold preparation behaviour, advanced-farm arrival/retreat and runtime performance acceptance remain open. The main animal navigator currently treats gates as full walls even when the worker leaf animation opens; this candidate does not grant animals free passage or change that existing rule.

## Verifiable bounded commands

- `node --test tests/raid-exterior-entry.test.js`:9/9 PASS,4280.145ms.
- `node --test tests/raid-entry-preparer.test.js`:15/15 PASS,7873.2567ms.
- `node --test tests/raid-exterior-advanced.test.js`:1/1 PASS,762.4388ms.
- `node --test --test-name-pattern='building completes|natural canyon|native Grand Canyon|genuinely open|mixed-material perimeter' tests/boundary-gates.test.js`:5 PASS,14 skipped,971.3084ms. This verifies default automatic-gate arguments and selected building/natural/mixed controls, not the whole gate suite.

Raw redirected stdout/stderr from those final invocations are retained. Times are descriptive CPU observations, not guaranteed slice bounds. The archive receipt identifies original negative observations without labelling reconstructed summaries as raw logs.
