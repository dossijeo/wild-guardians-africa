# Microevent validation evidence

## Current 3D billboard / low-poly review

All **40 types** (14 beneficial, 16 nuisance and 10 emergency visuals) are now implemented as camera-facing quads inside the real 3D scene, using original low-poly rendered sprites. The old Canvas renderer and vector atlas are removed. `billboard-catalogue-real-ui.json` records forty distinct successful mouse completions across paid savanna/empalizada, mangrove and canyon fixtures. The core clock is frozen only for DEV visual QA; forced events have economy disabled. Earlier unclaimed visibility probes are retained separately and are not counted as successes.

**79 directed tests pass**, including all forty through actual world projection and owned touch input, camera-independent centers, perspective sizing, floating origin, contact/anchor occlusion, cancellation, persistence and economic safeguards. The wooden attachment is offset onto the visible face of the real wall without modifying that entity. The QA target diagnostic selects a visible particle on explicit freeze; no per-frame occlusion raycast is added.

Normal production build, web-package validation and current build-time Off validation pass. Enabled JS includes the billboard renderer; Off JS excludes it. The original checkout remains on the same base with its 334 tracked deletions and three pre-existing untracked entries preserved; see `repository-state.json`. No campaign jobs or balance work resumed.

The transparent 512×512 atlas is **60,476 bytes**, generated locally from original 3D geometry with warm world-compatible lighting. Actual Intel UHD instance-preparation samples in `billboard-browser-performance.json` retain 202 non-frozen frames: approximately **0.4 ms median / 0.8 ms p95** CPU, excluding the subsequent GPU draw. One instanced mesh batches the sprites, glow, secondary particles and completion reactions. The existing particle CPU benchmark remains applicable to the unchanged physics module. These measurements are not a whole-game FPS or GPU-completion guarantee.

Current screenshots include `birds-lowpoly-world.jpg`, `birds-lowpoly-world-zoom.jpg`, `seeds-lowpoly-world.jpg`, `fireflies-lowpoly-world.jpg`, `fire-lowpoly-world.jpg`, `weeds-lowpoly-world.jpg`, `termites-lowpoly-world.jpg`, `flower-lowpoly-world.jpg`, `snake-lowpoly-world.jpg`, `fog-lowpoly-world.jpg` and `fallingdebris-lowpoly-world.jpg`. All earlier `*-catalogue-farm.jpg` images and Canvas performance reports below are historical. Physical touchscreen sessions are not claimed; current touch support is verified with actual projection/routing/particle tests for all forty definitions.

## Complete catalogue validation

The latest user direction expanded the catalogue and stopped all campaign simulations. There are no campaign jobs running and no 100-night completion gate for the current microevent work. Balance configuration is unchanged.

- All **40 types** (14 beneficial, 16 nuisance, 10 emergency) were shown and completed through the real application input path: `catalogue-real-ui.json`. Paid first-day fixtures cover savanna with actual empalizada walls, mangroves and canyon. Core simulation is frozen only for visual QA, and forced outcomes have economy disabled.
- **70 directed tests pass**. This includes all forty actual particle presets through owned touch input, hold completion at 30/60/120 Hz, physical behavior distinctions, gather destinations, tap visibility, connected snake segments, eligibility, interruptions, persistence, duplicate rewards, saves and audio catalogue integration.
- Production build, package verification and build-time Off build pass. The Off JS has no particle-overlay implementation.
- The complete original atlas is **512×512 / 89,452 bytes**, with transparent silhouettes, original vector sources, and validated nonempty sprite regions. See [the full sprite and event specification](../../MICROEVENT-CATALOGUE.md).
- `particle-catalogue-cpu.json`: 400,000 warmed samples across 40 presets, with 30 particles each; approximately **0.021 ms p95** for simulation alone.
- `catalogue-browser-performance.json`: actual Intel UHD; 201 retained non-frozen samples, approximately **0.4 ms median / 0.8 ms p95** for controller CPU including Canvas submission. This excludes asynchronous GPU completion.

Representative final-runtime captures include `snake-catalogue-farm.jpg`, `weeds-catalogue-farm.jpg`, `grain-catalogue-farm.jpg`, `termites-catalogue-farm.jpg`, `star-catalogue-farm.jpg`, `rainbow-catalogue-farm.jpg`, `vortex-catalogue-farm.jpg`, `fog-catalogue-farm.jpg` and `fallingdebris-catalogue-farm.jpg`. The last two use their appropriate mangrove/canyon worlds. All source hashes and the scope limits are retained in the JSON receipts.

The tests verify touch routing and live particle behavior; they do not claim a physical touchscreen session. Existing full-suite failures below predate the current catalogue expansion and were independently reproduced on the original base. No campaign tests were restarted after the user's explicit instruction.

## Historical checks before catalogue expansion

| Check | Observed result |
| --- | --- |
| First full `node --test tests` run | 4,111 passed, 4 failed, 0 skipped, approximately 814 seconds |
| Final full `node --test tests` run | 4,136 passed, 2 failed, 0 skipped, approximately 893 seconds; only the independently reproduced base failures remain |
| Original-base `tests/active-farm.test.js` | The same two sunflower/mixed-crop victory expectations fail with observed defeat; approximately 336 seconds |
| Audio inventory follow-up | Both source-line/hash failures corrected by regenerating the audited inventory and including the three microevent completion routes; all three catalogue tests pass |
| Final directed group | 67 passed: microevents and authoritative harvest/delivery integration, clock, exact money, save errors, translations and audio catalogue |
| Additional economy/magic/replay regression group | 48 passed: automatic harvest, harvest audio, income separation, Multiply persistence, individual magic, economic boundaries and deterministic replay |
| Production build | Passed; existing chunk-size and mixed-import warnings remain |
| Build-time feature-Off build | Passed; particle-overlay implementation is absent from the resulting JS bundle |
| Runtime audio validation | Passed: 126 SFX, source hashes/exports and music window metadata |
| Web asset verification | Passed: original geometry/animation bytes, textures/alpha, local decoder and GLB conformance |
| Production web-package verification | Passed: 713 files, 860 relative links, 22 runtime GLBs, no superseded original GLBs |

The final full suite includes the final runtime implementation (`ada819da6`). The subsequently added planning-worker boundary assertion also passes in the 67-test directed group; subsequent changes are tests and evidence only. This is not a claim that the full suite is green. The two active-farm failures are reproduced on the unchanged base and were not “fixed” by a broad rebalance or by changing their victory assertions.

## Actual gameplay and art

Captures use the real application, normal world renderer and management HUD at 1280×720. The seeded visual fixture pays for its center, three banana crops and one worker. The development fixture freezes core simulation for consistent captures and its forced events have economy disabled; it is not a balance experiment.

- `seeds-farm.jpg`: seeds drifting above visible planted ground.
- `birds-farm.jpg`: seven recognizable blue/cream birds over crops; four-frame internal wing animation.
- `fireflies-farm.jpg`: nighttime insects with procedural glow over the same farm.
- `reservation-fix-seeds.jpg`: a newly reserved seed event verified in the real application after the asynchronous camera-safety fix; deliberate hold also completed successfully.

All three events were completed by a deliberate approximately 2.2-second mouse hold on their projected anchor. Hover moves particles without completion. Pointer history is bounded to 16 pooled screen-space samples; mouse proximity preserves actual motion velocity. A dispersed flock leaves no invisible anchor hitbox, and accessible hold works at a visible bird rather than requiring the player to chase the original anchor. Opening the actual pause menu cancelled a live bird event with the ignored count unchanged at zero. Selecting Off removed the overlay canvas (observed count zero) and retained the same 220-coin farm balance; Adaptive was restored afterward. A 390×844 viewport check confirmed that panning leaves the strategic idle timer running while camera stability resets to zero; the viewport was restored after testing. Touch ownership and multi-frame hold behavior are automated pointer tests, not evidence of a physical touchscreen session. A separate real-UI check (`management-after-event.json` and `.jpg`) completed a seed event and then planted one millet through the original management controls within 15 seconds. Cash changed from 220 to 215, strategic idle reset, and the rescue counter recorded the qualifying preceding spawns. One core action can qualify more than one overlapping event window; this is a telemetry integration check, not a causal attention study.

The atlas is a transparent, original, lossless 512×64 WebP, 8,032 bytes. Automated image checks confirm transparency, nonempty sprite regions and distinct bird wing frames. Regeneration uses only the repository's existing Sharp dependency.

## Performance

`particle-cpu.json` measures 30,000 warmed Node CPU samples with 30 particles across all three presets: approximately 0.023 ms p95 for particle simulation alone. It excludes drawing and GPU completion.

`browser-performance.json` records the actual renderer:

`ANGLE (Intel, Intel(R) UHD Graphics (0x00009A60) Direct3D11 vs_5_0 ps_5_0, D3D11)`

Excluding frames whose presentation clock was deliberately frozen, 86 retained active-event samples have approximately 0.5 ms median and 0.9 ms p95 for controller work including Canvas draw submission. The rolling raw samples are retained; asynchronous GPU work is not included in those CPU timings. The final input/pointer implementation was reprofiled with 18 glowing fireflies: `browser-performance-final.json` retains 129 non-frozen samples, approximately 0.6 ms median and 1.2 ms p95 for controller work. That receipt includes exact source hashes; it is a heavier event than the earlier bird sample and is not an isolated whole-game GPU benchmark.

`frame-comparison.json` contains same-farm RAF intervals for Off, enabled quiet and active events. Background campaign simulations were running concurrently, so this is **not** an isolated FPS comparison or evidence that enabling events improves performance. Median whole-game rates were approximately 15 FPS Off and 20 FPS quiet/active, with large scheduling variance. The existing world render remains the dominant cost; this evidence does not promise 30/60 FPS on all integrated GPUs. There is one overlay canvas, at most 30 pooled particles and no added navigation or topology work per frame.

## Campaign comparisons

The completed seven-night screen (`screen-summary.json`) uses the existing legal Sabana/Mapungubwe/712 good policy. Off exactly matches the original-base SHA-256; ignore-all has identical simulation/economic results to Off. All daily reward caps passed.

| Policy | Observed nights | End coins | Delivered crates | Direct reward coins | Direct rewards / ordinary income |
| --- | --- | --- | --- | --- | --- |
| Off | 7 | 965 | 770 | 0 | 0% |
| Ignore all | 7 | 965 | 770 | 0 | 0% |
| Complete all | 7 | 858 | 768 | 9 | 0.105% |
| Complete half | 7 | 951 | 758 | 7 | 0.083% |
| Beneficial only | 7 | 931 | 774 | 14 | 0.163% |

Cash snapshots also reflect the virtual policy's changed planting/hiring thresholds; their differences are not direct microevent payouts. These runs mainly farm low-value millet, so bird losses round to zero. Banana deductions, multiplier ordering and delayed-harvest daily settlement caps are tested separately. Eight task-chain integration cases exercise an actual paid worker, automatic harvest, crop-to-crate provenance, physical delivery and existing coin settlement: the combined male/Multiply/fertile crop settles to 834 coins normally and 833 with a one-coin bird deduction. Reloading while ripe or carrying does not replay either the loss or delivery; disabling the pending deduction preserves the normal payout. Two cases disable losses or all economic effects immediately before the harvest finishes; the pre-simulation policy hook prevents a one-frame late penalty. These controlled postgame/mature-crop fixtures are not campaign survival evidence. Seven observed nights do not establish 100-night survival or biome-wide balance.

The executable comparison harness supports Off against the exact base and ignore/complete/half/beneficial-only policies through a requested 100-night horizon. Its results distinguish observed defeat, incomplete execution and actual survival. The subsequent long-running jobs were stopped by explicit user instruction, recorded in `simulations-stopped-by-user.json`; no completion result is claimed. Existing 100-night active-farm victory failures remain explicitly visible above.

## Reproduction and remaining limits

See `../../MICROEVENTS.md` for commands, supported effects, budgets, persistence, fake clock and forced-event controls. The complete 40-event catalogue is now implemented; the earlier three-event measurements above remain historical evidence. Underlying weather/hazard simulation and magic refills remain intentionally unsupported. Physical touch-device sessions, broader biome playtesting and isolated whole-game GPU benchmarks remain additional QA; emulated pointer tests and a single Intel UHD machine are not substitutes for those sessions.


Actualización de feedback y persecución: [MICROEVENT-FEEDBACK.md](../../MICROEVENT-FEEDBACK.md). Vuelo autónomo rápido en siete criaturas; VFX de contacto originales y SFX existentes seleccionados, con necesidades de audio pendientes documentadas. Grupo actual: 84 pruebas dirigidas y build de producción correctos. Las mediciones y los 40 completados previos se conservan con su alcance anterior al ajuste de vuelo/VFX; no son una nueva certificación de esta revisión.


Revisión posterior de mecánicas completas: [MICROEVENT-INTERACTIONS.md](../../MICROEVENT-INTERACTIONS.md). Los 40 tipos tienen una política principal explícita y se han resuelto mediante replay integrado en la escena sin hold auxiliar. Incluye arrastre/soltada, cepillado, giro bidireccional, extracción selectiva, guía de cadenas y captura por toque; 99 pruebas dirigidas, build normal/Off y paquete correctos. El informe `primary-interactions-review.json` detalla el alcance, la corrección de termitas y las limitaciones de hardware/audio. No se añadieron consecuencias económicas ni campañas simuladas.
