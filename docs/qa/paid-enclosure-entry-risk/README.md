# Paid-enclosure entry risk: bounded fixture and correction design

This is an independent Sabana/Saheliana seed712 fixture, not a reconstruction of the retained Gran Canyon campaign. Production navigation, raid selection, balance, RNG and clock are unchanged. No raid was spawned or advanced, and this is not campaign, performance or balance acceptance.

The native opening centre costs800. Ordinary commands plant one mijo for5, build all17 zarzas pieces for170 with one automatic gate and one native closed face, then hire one older woman for30. The remaining495 coins are real ledger funds. The rectangle is [85,6.2,92,17], the crop is(88,9), and the actual warthog radius is1.1. Time and elapsed remain0. The paid snapshot SHA256 is `6da79730d54ccc565ad560f230be274e26e805fc2aa994b6bc926da42cfa8707`. All394 frozen productive-source hashes match e040 provenance before the diagnostic. Entry computation leaves simulation/RNG serialization unchanged.

## Results and controls

| Ordinary presentation view | Camera / prepared selection | Other native evidence |
| --- | --- | --- |
| Eye(88,9), target centre(83,0) | Exterior(93.361498,11.855580); internal reproduction **false** | nearFarm fallback instead selects interior(88.390637,9.703146), with a native crop attack approach |
| Eye(88,20), target centre | Exterior(88.751860,23.007442), only3.1 from eye | Native entry/exit walkable; forward/reverse escape segments clear; real wall attack approaches; crop approach false through the current closed gate |
| Eye(88,9), controls target(88,6.5) | Interior(88,12.1), only3.1 from eye, same direct and prepared positions | Exit also interior; both walkable; reversible escape; native crop attack approach true |

The third view uses the game's actual `scene.syncChunks` convention: raidView receives camera position and controls target, which can be ground near a crop rather than the work centre. It is not a synthetic worker route or a reduced animal radius. The exterior view demonstrates a close legal alternative exists in this fixture; it does not prove one exists for every large enclosure/camera or biome.

`native-original/paid-enclosure-entry-03.json` retains the first two views and their negative direct/prepared control. `-04.json` adds the separately recorded crop-target view. Their CPU observations are1080.9811ms and1285.1601ms respectively, including opening, commands, path checks and preparation; these are not per-frame bounds or GPU measurements. The integration test passed1/1, duration1312.7358ms, before this archive was authored.

Two earlier fixture attempts failed and are retained byte-exact. Attempt01 wrongly expected `Game.hire` to return true; the native paid API returns undefined. Attempt02 expected the centre-target camera to reproduce internal entry, but it selected exterior instead. Both failed before output writing, so no missing raw state or mismatch quantity is reconstructed. The corrected diagnostic records false controls explicitly; the later crop-target view is a distinct declared case, not a reroll of the world or a campaign-policy change.

The archive auditor's first attempt also failed because it compared whole metadata rows across diagnostic versions: version03 used `focus`, while version04 explicitly separates `viewTarget` and `operationalCenter`. Its failure receipt is retained. The corrected read-only auditor verifies the two centre-view metadata values separately and still requires every retained native entry, exit, route and radius to be equal; original payload bytes are untouched.

Bounded placement previews preceding this fixture also contained negatives: centre rectangles accepted38/45 pieces in Sabana and36/45 in Canyon; a southern crop strip accepted16/20 in Sabana but Canyon crop placement was forbidden; fixed north/east/west Sabana candidates accepted17/17,19/19 and18/19 respectively. Only the north fixture was paid here. Those preview summaries are observations retained in this document, not substitute original command logs or campaign results.

## Source attribution

- `cameraRaidEntrySteps` validates bounds, footprints, separation, escape and attack reachability, but not membership outside a defended closed face. A reachable crop inside is consequently sufficient for acceptance.
- `nearFarmRaidEntrySteps` delegates through a virtual camera and has the same omission.
- Precalculation uses the same generator on private native Navigation; fixing only the synchronous caller would leave prepared internal entries.
- `spawnRaid` adopts prepared entries after matching request metadata and counts, without a separate exterior condition.
- Real escape checks can succeed entirely inside the enclosure. They establish local legal movement, not arrival from its exterior.

The terminal campaign's skipped pieces and terminal positions cannot establish its initial entry or full route. This independent fixture establishes the mechanism without making that historical claim.

## Proposed correction, not implemented

1. Derive protected closed components from actual live walls and native physical boundaries. Cache by geometry/operational revision; do not use the synthetic omitted edges used by automatic-gate construction as if they were built barriers. Natural cliffs, buildings and large props must use their actual geometry. A wall-only face polygon is a useful first case, not proof of a mixed natural enclosure for every actor radius.
2. Add a shared exterior eligibility predicate to the entry generator. Require each actor's actual footprint to begin outside protected components without intersecting their barriers. Do not use centre or bounding rectangle membership as a general replacement for polygon/body geometry. Keep the existing entry, separation and reversible exit checks for the whole group.
3. Enumerate exterior candidates near the camera and nearest relevant defended perimeter before the old fallback. For an enclosed farm, a legal approach to an exterior wall is a valid attack destination; crossing a closed wall is not. Open gates and natural passages remain usable only when native navigation with the actual actor radius supplies a route. Preserve selected side, RNG allocation, strike budgets, intro limits and target exclusivity.
4. Apply the identical predicate/ordering in synchronous, worker and cooperative preparation. Prepared adoption must reject stale or now-interior replies after wall/gate/collapse changes. Use the existing request key and revision ownership; retain cancellation and pending600 no-free-time semantics. Geometry and route work must remain incrementally budgeted, not a new synchronous exhaustive A* search.
5. Validate the correction first against these exact views: retain centre-target negative control, move crop-target/nearFarm entry outside, keep all actors/escape routes legal, and retain a nearby arrival. Add group12, mixed materials, rebuilt closures, gates open/closed, natural boundaries, save/reload, worker/cooperative parity and source/RNG checks before any pilot. The original results remain untouched.

An enclosure surrounding the whole current camera radius may have no exterior candidate satisfying the old camera-distance bound. That requires explicit review of closeness to the nearest attacked perimeter versus only camera/centre, not silently spawning inside or leaving a valid farm indefinitely pending. This fixture demonstrates a nearby alternative locally, not a general solution. Actual traversal, advanced-farm coverage, six-biome/matrix coverage, cold geometry cost and production performance remain open.
