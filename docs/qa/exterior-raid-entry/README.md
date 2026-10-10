# Physically exterior whole-group entry

Candidate branch `codex/exterior-raid-entry`, based on main `be3c3f34`. No campaign, renderer or GPU benchmark was executed for this change. Source SHA256 for the CPU diagnostic is in `cpu-cost.json`; the reproducible generator is `tools/check-exterior-raid-entry-cost.mjs`.

## Behavior and physical policy

The ordinary selector runs first. With living walls, every birth and exit must have a sufficient exterior witness: a full-radius native swept segment to outside a finite reference region. That region includes active bounds, wall geometry, building footprints and a48m margin for nearby natural barriers. An AABB alone is never treated as proof of enclosure. If the ordinary result lacks these witnesses,16 deterministic camera-side directions project beyond the real constructed envelope. A deterministic multi-row formation can accommodate the complete composition when one lateral camera lane cannot. This adds no A* searches to the projected camera/formation paths; the original selector retains its bounded searches.

Coordinates, fluid restrictions, slope, obstacle geometry, radii and all collision sweeps remain native. There is no actor thinning, teleport, crop deletion, simulated raid completion or budget/hit change. A closed40m and320m fixture physically starts outside and reaches a native wall hit before any crop hit. Open, gated, separate and concave defenses preserve valid arrivals. A constructed wall closing a native slope pocket is tested separately. Six actual biome opening terrains verify birth/exit walkability with their original fluid policy.

## Readiness and persistence

Group choice is retained in the logical plan. A rejected residency check does not consume preferred-side RNG, hit RNG or IDs. Snapshot/reload before spawn produces exactly one complete group with the original RNG sequence. Failed selection is cached in a four-key per-navigation memo; changed view, bounds, group, RNG, geometry epoch or structure operational state changes the key. A failure reports a deduplicated notice and remains pending rather than silently canceling the guaranteed night. At time600, pending night prevents closeNight, events and hiring; normal elapsed time, cooldowns and workers continue. Clock edges strictly after current time prevent a zero-step loop.

The existing worker prepares the same selector. Proactive pending pins survive bounds-only key refresh; otherwise expanding bounds and deleting the accepted result would oscillate indefinitely. View/geometric/RNG/group changes invalidate the pending context. Worker failure disables worker preparation and allows the existing synchronous fallback. That fallback can cause a long frame: it is not claimed to be non-blocking.

The renderer requires demanded birth/exit chunks to be installed before spawning. Only their sparse keys are added to streaming demand, plus each live actor's current/exit footprint and next4m of its route. Enlarging navigation metadata does not fill that rectangle with chunks. Cancellation, departure and disposal remove demand. In measured closed fixtures5/32/72 actors demanded2/4/6 distinct chunks, respectively.

## CPU diagnostic

Fresh fixtures were created in one process; this is an observational CPU diagnostic rather than an isolated statistical benchmark or a frame-time/GPU claim. Closed5/32/72 selections took33.64/112.19/62.33ms; native Desert5 took313.96ms, including8 original-selector path calls. JIT and terrain memo warming affect row order. The subsequent100 residency-rejected retries took5.36/4.13/5.72/2.92ms accumulated with zero walkable, segment or path calls. The diagnostic deliberately distinguishes selection from repeated retries. No production performance threshold is inferred from these four samples.

## Validation

-124 directed tests passed in24.45s: topology, whole32/72 cohorts, native wall damage, six biomes, real worker/direct spawn parity, snapshots, RNG, pending dawn, stale reply invalidation, memo retries, sparse lifecycle, far-region regressions and daytime draw behavior.
- Production build passed in15.09s; existing large-bundle and far-atmosphere import warnings remain.
-91 final camera, i18n, SFX/capacity and campaign-driver/observer contracts passed in30.07s on main base be3c3f34 plus this candidate.

Commands:

```text
node --test tests/raid-exterior-entry.test.js tests/raid-entry-residency.test.js tests/raid-entry-preparer.test.js tests/acceptance-daytime-raids.test.js tests/far-adopted-region.test.js
node tools/check-exterior-raid-entry-cost.mjs
node tools/audit_sfx_catalog.mjs
node tools/audit-native-raid-capacity.mjs docs/qa/native-economic-balance
npm run build
```

## Explicit limits and remaining acceptance

The16-ray witness is sufficient, not a complete reachability/enclosure classifier. It may conservatively reject legal bend-only routes, and distant natural barriers beyond its finite reference are not globally classified. No finite geometric selector establishes accessibility for every imaginable player-built/terrain enclosure. An unavailable complete group is visibly reported and held pending until context changes; there is no dishonest quiet-night completion. This limitation must remain explicit during parent review.

Large-group birth legality and spacing do not establish long-term traffic, destruction rate, survival or campaign economics. None of those is claimed here. Existing ordinary near-camera arrival tests remain applicable; a giant enclosure necessarily moves birth farther out.

Renderer tests use the real streaming method with CPU doubles. They do not prove visual floor/chunk readiness, absence of horizon overlap or visibility during the director's camera travel. Chunk installation is a logical readiness gate; resident color groups still obey existing near/far visibility policy, and animal meshes are independent entities. Actual renderer QA remains required before claiming visible acceptance, particularly for exterior pins and a moving camera.

## Sequential readiness owner refinement

Parent review found that a retained daytime group could compete with the nighttime group for the single residency demand. `activeRaidEntryPlan` is now the shared pure owner selector: a rolled daytime plan whose trigger has passed stays ahead of the nighttime plan until its complete raid spawns. Production clock events, the worker preparer and the headless driver use that ownership policy. Group choice and original side/hit draws remain untouched. The preparer may now supply the daytime entry as well as nighttime entry.

The directed coexistence test begins with a retained group at time200, waits100 simulated seconds with residency rejected across the night trigger, verifies stable demand and unchanged RNG, then accepts residency. Normal Game.tick motion resolves the daytime raid and spawns the retained nighttime group; neither plan disappears and each spawn consumes exactly its native side/hit draws. A separate driver test verifies it waits for that daytime key rather than reaching a false nighttime observation deadline. The driver samples accepted ready-context evidence after its asynchronous yield, so the first returned worker result is recorded as well.

Initial217-case preparation exposed one diagnostic observer failure: readiness was accepted while `readyContexts` remained empty because it was read before the yield. The full pre-fix125/126 trace is preserved as `owner-context-before-yield-failure.tap`; no physical failure is inferred from it. After correction, all217 directed contracts passed in25.84s, archived in `owner-final-regressions.tap`.

The source-pinned CPU diagnostic was regenerated after this refinement: closed5/32/72 took23.46/83.99/40.79ms, native Desert5 took242.26ms;100 memoized retries again performed zero navigation calls. The initial diagnostic is preserved as `cpu-cost-before-owner.json`. Neither pair is a controlled before/after performance comparison.

Final owner-refinement production build passed in13.54s; the existing bundle/import warnings remain. No local processes remain active after validation.
