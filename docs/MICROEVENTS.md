# Adaptive interactive microevents

The complete proposed 40-event catalogue adds lightweight interactions to the existing omniscient farm. The user explicitly stopped campaign simulations and balance work; do not restart them. Worker automation, management tools, campaign clock and magic rules remain authoritative. No Guardian Mode or replacement simulation is introduced.

## Architecture and integration

The original prototype was built on `ada86732c`, before Wild Engine became the game's navigation authority. The integration branch `codex/adaptive-microevents-main-integration` transplants only the microevent feature onto current `main`. Terrain, collisions, navigation and simulation remain authoritative in Wild Engine and the game. Microevents read the renderer's existing visible crop and wall lists; they do not create a second spatial world or issue route queries. The visual QA fixtures now use a paid Wild Engine opening and the current world version.

`src/microevents/` contains eight small modules:

| Module | Responsibility |
| --- | --- |
| `definitions.js` | Event catalogue, atlas coordinates, animation, interaction and physics presets, tuning constants |
| `pointer-trace.js` | Pooled 16-sample screen-space history and bounded mouse/touch velocity, independent of camera anchors |
| `particles.js` | Pooled local particle coordinates mapped to a fixed world plane; continuous attraction, repulsion, advection, swirl, dispersal and absorption; accessible hold |
| `space.js` | Fixed world-plane coordinates, world-space centers, perspective projection, pointer ray-plane conversion and contact occlusion |
| `billboards.js` | One instanced world mesh; camera-facing sprite quads, existing depth buffer, original low-poly atlas; no runtime Canvas |
| `director.js` | Independent RNG, quiet-period opportunities, camera stability, cooldowns, repetition/fatigue weighting and attention telemetry |
| `economy.js` | Whitelisted outcome settlement, existing money transactions, production allowances, one-harvest deductions and snapshot validation |
| `controller.js` | World projection, input ownership, visibility, lifecycle, save ordering, audio and development diagnostics |

The existing application frame synchronizes disabled economic effects before advancing the simulation, then prepares particle instances after camera/world synchronization and immediately before the existing world draw using real monotonic elapsed time rather than accelerated simulation time. Projection occurs outside the renderer's temporary floating-origin transform. The existing render synchronization exposes its already-computed visible crop list. At opportunity time, at most 24 candidates are sampled every 0.75 seconds; one anchor is projected while active. There are no added navigation/path/topology requests or per-frame world scans. A contract test verifies that microevent RNG updates, coin rewards and reserved harvest deductions leave the existing planning-worker request key and payload unchanged.

Successful core commands are observed through the existing `commandIds` length. Failed commands, automatic crop work, camera movement and microevent outcomes do not reset the management idle timer. Camera pose changes, wheel input and active world pointers delay new spawning until 0.8 seconds of stability. UI surfaces, tools, tutorials, important notices, any raid, pause, hidden page, result and cinematics suppress spawning; interruptions cancel without a timeout penalty.

The optional `microevents` save field does not change save version 1. Legacy saves remain valid. It contains only RNG/serial, cooldowns, recent history, production allowances, bounded nuisance history, one reserved ticket and outstanding harvest deductions. Particles, gestures and screen positions are never persisted. Disabling the feature does not add this field to legacy saves.

## Interaction and presentation

Pointer ownership is decided in the stage's capture phase before OrbitControls, wall drawing or picking receive an event. UI-origin gestures remain UI-owned. Only a primary gesture starting within a live particle group can be claimed. Claimed moves/releases are consumed, including after cancellation, so a single gesture cannot also plant, build or select. Additional touch contacts cancel safely. Unclaimed camera gestures cannot complete particles. A second contact beginning on UI cancels the world interaction without consuming that UI gesture. Screen-space pointer history is reprojected against the current world anchor each frame, so moving the camera does not invent pointer velocity. Mouse proximity causes physical feedback without awarding completion; touch requires contact. Holding after contact with a visible particle completes its group without rapid motion or repeated tapping, even while birds scatter. Empty former anchor positions do not retain an invisible input hitbox. Reduced motion lowers travel and bird animation speed.

The full [catalogue and sprite specification](MICROEVENT-CATALOGUE.md) documents all 14 beneficial opportunities, 16 nuisances and 10 rare visual emergencies. Shared presets cover attraction, repulsion, advection, swirl, orbit, falling objects, rooted extraction, gathering toward a crop or sack, periodic emergence and linked snake segments. Tap targets can react immediately after explicit ownership; all types retain continuous interaction and an accessible hold fallback.

Events last 6–7 real seconds with a short visual exit. One original transparent 512×512 lossless WebP atlas contains actual low-poly 3D renders, including selective wing/flame/flash animation. Render the source PNG with the local `tools/microevent-sprite-authoring.html` page (Three.js, original geometry, matching warm world light), then run `node tools/generate_microevent_assets.mjs` to validate/compress it using the existing Sharp dependency. No external runtime service or new dependency is used.

## Timing, economics and persistence

Adaptive is the default. Settings expose Off, Low (0.45× opportunity rate), Adaptive (1×) and High (1.5×). `VITE_MICROEVENTS=off` is the build-time kill switch. The earliest opportunity is 9 seconds after a core command, with a 14-second global quiet cooldown and event cooldowns of 55/60/80 seconds. A bounded continuous-time hazard is sampled probabilistically, rather than on a repeating spawn timer. Three ignored events halve probability and reduce nuisance weighting; voluntary completion recovers one ignored step. At most two nuisance starts occur in any 120 seconds of foreground runtime. Idle duration does not increase frequency indefinitely. All emergency types share a persisted six-minute cooldown.

Only ordinary delivered crop income establishes an allowance. Microevent credit, starting capital, refunds and wages are excluded. Allowances are conservative and based on the previous observed in-game day's deliveries:

- Positive: `min(5 coins, floor(previous ordinary income × 1%))` per day; one coin per completed seed event.
- Negative: `min(2 coins, floor(previous ordinary income × 0.25%))` both when reserving losses and when settling them on harvest.
- Per crop: `floor(base harvest value × 0.5%)`, once per crop, without stacking. With current values this is one coin for banana and zero for the other seven crops.
- The deduction is applied after ordinary agricultural, worker and Multiply bonuses, without multiplying the nuisance. The ordinary whole-coin settlement is reduced by the permitted integer amount. Plants, paths, growth, water requirements, structures and health are unaffected.

Low-value crops remain valid visual bird anchors with zero loss. The first day and a newly enabled partial day's unobserved production grant no invented allowance. Destroyed targets, changed days, unavailable gameplay and cancelled outcomes settle to zero. Turning Off cancels current events and clears outstanding unharvested deductions. Previously settled legitimate transactions are not rewritten.

A ticket and spawn cooldown are saved **before** an event becomes interactive. Failed saves suppress the event. Settlement uses the reserved ticket, not a caller-provided amount, clears it once, and persists the result. Duplicate callbacks cannot pay twice. Reload discards an interrupted visual event with no penalty and restores cooldowns; it cannot replay its reward. Independent microevent RNG never advances simulation RNG. Pending deductions and settled daily caps survive save/load. `MicroeventHarvestLossApplied` records the actual sale reduction separately from a reservation.

## Diagnostics and reproducible validation

Development-only `?qa-microevents` exposes timers, suppression reasons, opportunity score, completion/ignore counts and an owned controller handle. Logs are bounded to 256 records: opportunities, category/type, first contact latency, completions, ignored events, cancellations, misses, reserved/settled economic deltas and subsequent core actions within 15 seconds. Idle Rescue Rate is rescued event spawns divided by total spawns. A core action during the event or within 15 seconds after it finishes qualifies; each spawn counts once, including safe cancellation by a core action. Runtime frame samples include controller work and world-instance preparation, not asynchronous GPU completion.

`AttentionDirector` accepts an injected random function; `Microevents` accepts an injected monotonic clock. `force(id, {economy:false})` forces a definition while retaining valid anchors, world conditions and suppression checks. `settings.microeventEconomy=false` disables all economic effects; `settings.microeventLosses=false` independently disables and clears nuisance deductions while keeping seed rewards. These are test hooks, not player-facing rewards or cheats.

Commands:

```sh
node --test tests/microevents.test.js tests/microevent-harvest.test.js
node tools/benchmark_microevents.mjs docs/qa/microevents/particle-cpu.json
node tools/prepare_microevent_fixture.mjs
npm run dev -- --port 5184
```

For visual QA, run `node tools/prepare_microevent_fixture.mjs` and visit `/?qa-microevents&qa-microevents-fixture`. This loads a paid, seeded Wild Engine farm through the **real application loading path and world renderer**. Only this development route freezes core simulation for reproducible screenshots. The QA buttons set day/night visual conditions and force cosmetic outcomes; Freeze event provides a controllable presentation clock. These screenshots do not certify campaign economics. Normal gameplay and production builds do not have these controls or a frozen clock.

For additional visual fixtures, run `node tools/prepare_microevent_catalogue_fixtures.mjs`, then use `?qa-microevents&qa-microevents-fixture=wood`, `=wet` or `=rocks`. These fixtures issue ordinary paid first-day commands and never tick or simulate campaigns. The development selector can show any event while retaining valid world, biome, anchor and UI conditions; its forced presentation bypasses opportunity cadence and type budgets for QA, with economy disabled.

## Intentionally unsupported effects

All 37 events added after the initial seeds/fireflies/birds slice are cosmetic. No growth modifier, magic refill, new currency, weather simulation, fire propagation, irrigation, terrain editing, topology change, worker disturbance or structural damage was introduced to justify a visual. The existing original seed reward and tiny bird-loss adapter are unchanged. The complete original catalogue is present; broader device playtesting remains distinct from implementation. Physical touchscreen sessions are not claimed by mouse captures or automated pointer tests. No broad balance change, campaign simulation or merge is part of the current work.

## World billboards and art integration

The user clarified that particles must be inside the 3D world. The previous Canvas presentation has been removed. Particle centers now live in a fixed world plane, with a small depth spread for airborne groups. Ground interactions use a world-ground plane. Only the quad faces the current camera, in the vertex shader. Zoom changes apparent size naturally, camera orbit never drags particle centers, and opaque buildings/terrain/vegetation occlude the sprites through the existing depth buffer. The batch does not write depth or cast billboard-shaped shadows. The existing floating-origin transform is preserved.

Input projects actual world particle centers and converts contact rays back into local physics coordinates. A contact-only raycast checks existing farm structures and terrain before claiming an interaction; no per-frame geometry raycast or engine query is introduced. One instanced mesh, one atlas and bounded pooled attributes provide the complete particle, glow, secondary-sprite and completion presentation. Native VFX depth capture excludes the transparent batch using its existing rules.

Sprites are now genuine renders of original 3D geometry: faceted bodies, wings, leaves, clouds, flames and objects, with warm directional light, hemisphere ambient light, opaque self-shadowing, flat normals and transparent backgrounds. Source: `assets-source/microevents/lowpoly-models.js` and `lowpoly-atlas.png`. The authoring page uses a separate temporary renderer only while producing assets; the game reuses its existing renderer and context. The earlier `*-catalogue-farm.jpg` captures document the superseded flat Canvas implementation and are not evidence of this new rendering path.

## Final review evidence

All forty definitions have been shown and completed through actual world-billboard input in the real application. See `docs/qa/microevents/billboard-catalogue-real-ui.json` and the current low-poly captures. The final directed group passes 79 tests, including actual world projection and owned touch completion for every definition. Normal and Off production builds pass. Intel UHD CPU instance-preparation p95 is approximately 0.8 ms across 202 non-frozen frames; GPU completion is outside that measurement.

Wooden event anchors are offset to the visible empalizada face at spawn, with no structure mutation or camera-follow movement. Occluded contact targets remain unclaimable. The development Freeze control computes a visible test target only on explicit request; normal frames do not perform visibility raycasts. Earlier Canvas captures and seven-night campaign artifacts are historical and are not the evidence for the current renderer or a new campaign claim.


Actualización de feedback y persecución: [MICROEVENT-FEEDBACK.md](MICROEVENT-FEEDBACK.md). Vuelo autónomo rápido en siete criaturas; VFX de contacto originales y SFX existentes seleccionados, con necesidades de audio pendientes documentadas. Grupo actual: 84 pruebas dirigidas y build de producción correctos. Las mediciones y los 40 completados previos se conservan con su alcance anterior al ajuste de vuelo/VFX; no son una nueva certificación de esta revisión.


Revisión posterior de mecánicas completas: [MICROEVENT-INTERACTIONS.md](MICROEVENT-INTERACTIONS.md). Los 40 tipos tienen una política principal explícita y se han resuelto mediante replay integrado en la escena sin hold auxiliar. Incluye arrastre/soltada, cepillado, giro bidireccional, extracción selectiva, guía de cadenas y captura por toque; 99 pruebas dirigidas, build normal/Off y paquete correctos. El informe `primary-interactions-review.json` detalla el alcance, la corrección de termitas y las limitaciones de hardware/audio. No se añadieron consecuencias económicas ni campañas simuladas.
