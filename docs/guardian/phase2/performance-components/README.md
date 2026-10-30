> Correction (2026-10-30): the night-31 campaign fixture uses legacy-js navigation/world loading. Its saved state has no wildEngineWorldVersion, and the campaign branch bypasses prepareWildEngineWorld. Earlier descriptions of campaign-derived runs here as native are incorrect. Their measurements and outcome equality remain historical legacy-engine evidence only; they do not validate Wild Engine performance. Non-campaign lightingReview runs explicitly reporting spatial-wasm are unaffected. A compatible native populated-world comparison remains required.

# Isolating Guardian presentation cost

Current reference at 9d69dcaa5: eight balanced blocks, identical Attack commands every 600 ms, 1.2 s warmup plus 4 s samples, twenty static beasts and presentation-only clock. No navigation/ragdoll cost is covered. Single IAB tab confirmed, Intel UHD, no hidden frames. current-abba.json shows reference p95 near 50 ms versus full Guardian near 67 ms; this remains a meaningful presentation regression, not acceptable merely because animation CPU is small.

Extended the existing QA block runner with explicit mode order and visible component selection. `body-effects.json` uses reference/body/effects/all/all/effects/body/reference. Body alone retains p95 near 50 ms; effects alone and full presentation are near 67 ms. All presentation updates/prepare paths remain active for component modes; rendering visibility differs. This isolates rendered components, not independent update costs.

`effect-parts.json`: reference/aura/vortex/beam/beam/vortex/aura/reference. Aura and vortex retain p95 around 50 ms, beam group around 66.5 ms. Draw p95: 93 reference, 95 aura/vortex, 96 beam. Beam group includes active discharge core, beam, impact ring and retained attack echoes. No attribution yet to a specific draw, buffer or shader; further isolation/optimization required. No visual quality was reduced by these QA visibility controls.


## Dynamic discharge instance buffer

The main discharge uses an InstancedMesh whose matrices are rewritten every active frame, but its instanceMatrix retained Three.js default static usage. Retained attack echoes already declare DynamicDrawUsage. Applied the same declaration to the main beam before its first upload; no geometry, shaders, materials, effect duration, instance capacity, draw count or visual density changed.

`dynamic-beam.json` repeats the original eight-block full-presentation comparison. All four Guardian blocks now have p95 49.895–49.990 ms (previously 66.535–66.710), average 28.20–28.71 FPS (previously 23.02–23.95). Same-run references are 28.83–29.45 FPS, p95 49.870–49.915. This supports retaining the buffer declaration, but does not identify the precise driver synchronization mechanism. Three retained-attack tests and production build pass with existing warnings.

This is one before/after sequence on Intel UHD in a controlled presentation-only workload. Reverse-order/static control and moving-incursion comparisons remain necessary before broad performance acceptance. Baseline Wild Engine work remains outside this change. The new result supersedes the earlier conclusion that current presentation necessarily retains the 67 ms p95 in this fixture; the historical measurements above remain valid for their revisions.


## Reverse control

At 362e7019f, temporarily changed only the main beam instanceMatrix usage back to StaticDrawUsage, reloaded the same fixture and repeated all eight blocks. `reverse-static.json`: all four Guardian p95 values return to 66.49–66.555 ms, average 23.36–24.11 FPS; reference p95 remains 49.855–49.920 ms. Restored DynamicDrawUsage, verified zero source diff, reloaded and repeated. `restored-dynamic.json`: all four Guardian p95 values return to 49.900–49.910 ms, average 28.58–28.83 FPS. The source remains dynamic; the static control was never committed.

This A/B reversal strengthens attribution to the instance buffer usage declaration in this hardware/workload; it does not prove a particular driver mechanism. Original and restored geometry/effects/draw counts are identical. The presentation-only regression is addressed in the repeated test, but moving navigation/physics workloads and other GPUs still need separate validation. The baseline renderer is unchanged.


## Moving incursion comparison at 785f8b29b

Restored the same night-31 campaign snapshot in separate fresh loads, reference first and Guardian second. Native Game.tick/navigation and physical impacts remain active in both; only Guardian presentation differs. Fixed .05 s steps, 400 frames/20 simulated seconds, no health/cooldown resets. Initial animals and complete recorded final outcomes match exactly. Both runs issue one valid Attack at .55 s against animal-63429 (health 56); later scheduled opportunities find no valid active target. Thus this is not a sustained many-Attack workload.

Reference: 10.1413 FPS, p95 149.695 ms, p99 199.695 ms. Guardian: 10.2537 FPS, p95 149.700 ms, p99 183.030 ms. No hidden frames or runtime errors. Guardian animation p95 .190 ms, VFX p95 .560 ms, peak one physical ragdoll. These sequential runs show no observed p95 regression and preserve logic, but cannot establish an improvement or broad performance acceptance: baseline is slow, a single attack has limited frame coverage, and run order is not counterbalanced. Do not attribute the lower p99 to the optimization from this pair. Baseline optimization remains assigned elsewhere.

Raw status/report files: moving-reference.json and moving-guardian.json. moving-comparison.json records exact outcome checks and memory, draws, physics and tail metrics. No image/visual acceptance is claimed from this timing run.


## Sustained raid fixture

The old saved state is at time=600 with two surviving animals carrying only one/three offensive hits; it cannot exercise repeated valid attacks. Added optional `freshRaid=1` to the campaign QA fixture: keep the restored farm, discard its old raid before world/native initialization, call the real planNight, and set the night clock to the newly planned arrival. This is an explicitly derived scenario, not an untouched save replay. Production rules, costs, cooldowns, health and hit budgets are unchanged. The measurement runs 1200 fixed .05 s frames (60 simulated seconds).

First Guardian-enabled execution uses the planner's 16-beast first wave, 135 workers, 51 structures and 5362 plants. Five valid Attack commands occur at .55, 12.65, 24.75, 36.85 and 48.95 s. First target health falls 84→56→28→0, then targeting switches to a second beast. Zero runtime errors, zero roll failures, one visible Guardian maximum, peak one physical ragdoll and no active physics at end; no hidden frames. Receipt: fresh-raid-guardian.json.

This run alone is not a performance comparison. Average 8.9347 FPS and p95 149.835 ms include the existing slow farm/native workload; no cause or optimization acceptance is inferred. A fresh reference run of this exact derived scenario, followed by outcome/command equality checks, remains required. This change only adds QA setup/measurement options and does not alter the game.


### Sustained reference completed

Reference run after the Guardian run: same derived scenario, five identical command times/targets/health values and exactly equal recorded final outcomes. Both complete 1200 frames with no runtime errors. Reference 8.9225 FPS vs Guardian 8.9347; p99 183.060 vs 182.880 ms; p95 166.045 vs 149.835 ms. Equal 1076 frames over 50 ms; 403 vs 394 over 100 ms. This sequential pair shows no observed added regression but does not prove an improvement from the p95 difference.

Crucially, maximum frames are 10509.34 ms reference and 10758.605 ms Guardian: both contain a severe spike. The run is not fluid and this comparison does not attribute the shared spike to a particular subsystem. Do not hide this with mean/p95 statistics or treat it as phase performance acceptance. Baseline investigation remains elsewhere.

Guardian animation CPU p95 .185 ms, VFX .620 ms; reference/Guardian physics p95 5.220/5.330 ms. Raw heap readings differ between fresh browser loads and include allocation/GC noise; they are not per-feature retained-memory attribution. Full metrics and exact equality checks are fresh-raid-comparison.json; raw reference is fresh-raid-reference.json. This validates unchanged outcomes with repeated legitimate casts in the sampled workload, not every raid, GPU or camera/control responsiveness condition.

## Compatible native snapshot loading (2026-10-30)

The nativeCampaign=1 QA route restores docs/qa/browser-visibility/native-farm-current-fixture.json, verifies its world version through prepareWildEngineWorld(..., loaded:true), and loads rendering/navigation from the same spatial session. It does not convert the old terrain or relocate its village. The inspection camera now falls back to the center when no living raid target exists. Reports distinguish native-farm-day1 from legacy-night31 instead of hardcoding night-31 provenance.

Executed nativeCampaign=1&lightingReview=1: spatial-wasm, one worker, one structure, one crop, no animals, no captured errors. Screenshot and receipt: native-snapshot-load.png/json. This establishes the compatible loading path only. A populated native scenario and matched runs are still needed; this sparse opening farm is not representative of a large incursion. No game-production code changed.
