# Interactive loading screen — implementation contract

User specification received 2026-10-08. Dedicated branch `feature/interactive-loading-screen`, based on `8105979699c71a33c7cc8cfffd878fc0639bf451`. This document preserves the complete requirement scope; checkboxes are acceptance requirements, not current claims.

## 1. Mission and workflow

Replace New Game and Continue loading with a fully functional, polished, interactive, GPU-optimized loading experience. Inspect architecture, rendering, assets, saves, menu transitions and world initialization. Work only in the dedicated branch from latest main. Implement, benchmark, test and visually inspect, fix failures, commit and push. Open a main PR only once complete and validated. **Updated user authorization: root reviews code, evidence and CI and merges autonomously when ready, then pulls main; further human approval is not required.** No unrelated gameplay changes. Loading refactors must preserve compatibility. Critical requirements cannot be silently weakened or bypassed; impractical architectural requirements must be reported explicitly.

## 2. Creative concept

Small reddish-brown African soil diorama, soft fog concealing boundaries, exactly the main game's skybox asset/conventions. Three or four naturally distributed maize plants grow with loading; empty soil accepts additional mouse/touch planting. Existing stylized aesthetic, geometry/morphs and gentle procedural leaf movement. No extra decorative objects, asset dependencies or interface panels; loading indication minimal. Completion raises/tilts camera to sky, hands off to world while only sky is visible, reveals panorama then travels to gameplay pose, feeling like continuous movement.

## 3. Menu-transition preload

During the existing start/continue menu animation initialize diorama resources, shared sky/GPU resources, maize geometry/textures, lightweight shaders/materials, fog, soil and initial plants; warm pipelines. First shown frame must be fully rendered and interactive, without black frames, delayed textures, compile stalls or popping. Do not delay/break menu animation. If not prepared yet, keep a visually continuous fallback rather than showing an incomplete scene. Both start and continue preserve existing loading/restoration semantics.

## 4. Interactive growth

Three/four initial plants represent actual loading progress through all five maize stages and continuous existing morphing. Pointer mouse/touch planting on suitable empty positions: prevent overlap, bounded safe capacity, immediate feedback, optional interaction, never wait for player. New plants start as seedlings and smoothly catch current global progress in roughly one second, then track global progress without overshoot/discontinuity. All mature at verified 100%; never show 100% before world genuinely ready. No harvesting, extra continue button or artificial real-save crops.

## 5. GPU implementation

Shared geometry/materials, instancing, vertex shader growth/wind and per-instance growth preferred. Minimal draw calls and CPU animation, no physics or farming simulation initialization solely for display. Shadows/post effects only if negligible cost demonstrated. Reuse rendering/crop utilities and existing architecture. GPU animation does not solve main-thread blocking: uninterrupted delivered frames during initialization are the actual objective.

## 6. Non-blocking initialization

Investigate procedural terrain/chunks, biome initialization, save restoration, geometry creation, asset decode, texture upload, shader compilation, impostors, mountains and initial farm/camera. Identify real blocking operations. Use Web Workers where suitable, cooperative batches, GPU uploads distributed across frames, asynchronous compilation/warmup where supported. Preserve procedural determinism, gameplay and saves. No fake asynchronous wrappers around synchronous work. Document remaining unavoidable blocking and minimize it.

## 7. Real progress

Use monotonic aggregator of actual work/milestones, with meaningful measured weights (configuration/save, initial terrain/chunks, biome/vegetation, buildings/crops/entities, GPU resources, visible scene readiness). No arbitrary timer or premature completion; estimated weighted progress must be distinguished from verified readiness. Handle failures, diagnostic stalled stages, no indefinite opaque 99%. Cinematic begins only once required work is complete.

## 8. Cinematic

Tunable phases: A ~0.7s stop planting, retain maize animation/render, smoothly raise/tilt toward sky; B ~0.4s sky-only handoff matching orientation/exposure/color/atmosphere with subtle crossfade only if necessary; C ~1.4s world camera tilts down revealing prepared biome/farm panorama using existing distant terrain/mountains/impostors; D ~1.5s eased travel to exact gameplay camera state, appropriate HUD/control reveal. Approximate total four seconds. Do not force maize into actual world or trigger expensive new chunk generation during panorama. If no safe path, simpler sky transition rather than clipping/intersection.

Support all six biomes/all cultures, new/existing saves, empty/dense farms, aspect/orientation, desktop/mobile input and time of day. Continue must preserve intended gameplay position/orientation; never overwrite it with cinematic pose. Respect reduced motion using simplified transition where feasible.

## 9. Ownership and lifecycle

Reuse renderer and sky resources; avoid redundant uploads, a second renderer architecture and extra loops. Do not dispose shared main-world resources. Release loading-only resources. Verify repeated start/menu/load cleanup, cancellation/error/interrupted loads and no async writes to destroyed scene. No significant peak RAM/VRAM increase.

## 10. QA and performance

Before/after measurements: first interactive loading frame, total initialization, loading frame times/long frames/stutters, main-thread blocking, shader stalls where measurable, peak RAM/GPU resources where measurable, time until controls. Test each biome new game, continue, heavy farm, repeated loads/menu, mouse/touch, portrait/landscape, slow/resource-constrained loading, failure/cancellation. Acceptance: no significant total-time/memory regression, persistent stutter, rendering/gameplay/camera regression, unhandled errors or leaks. Aim 60 FPS on capable hardware, graceful lower-end behavior. No unmeasured improvement claims.

## 11. Constraints

Existing conventions/assets/morph/sky/camera utilities, modular maintainable implementation, no unnecessary dependencies, no unrelated mechanics/save-format changes. Preserve menu behavior and work without input. Feature must feel native, not a separate minigame.

## 12. Completion and PR gates

- [ ] Menu animation prepares diorama; fully rendered first frame.
- [ ] Three/four initial maize follow real loading progress and all five stages.
- [ ] Additional mouse/touch planting; safe capacity/non-overlap; smooth catch-up.
- [ ] Loading proceeds without input and remains responsive.
- [ ] Seamless skybox handoff and biome-safe panorama.
- [ ] Exact intended gameplay camera/control/HUD restoration.
- [ ] New/continue, existing save compatibility and empty/dense farms.
- [ ] Lifecycle cleanup/repeated loads/cancellation/failure verified.
- [ ] Automated checks and available builds pass.
- [ ] Visual and performance QA completed across compatibility scope.
- [ ] No known blocking defects; no prematurely opened PR.

Final PR must include implementation summary, architecture/files, real-progress method, CPU/GPU optimization, cinematic behavior, measured baseline/comparison, tests/coverage, explicit limitations and screenshots/demo where feasible. Push feature branch and request root review. Root may merge autonomously only after those gates pass.

User amendment relayed by root: «Prefiero que la rama feature/interactive-loading-screen te encargues de mergearla de forma autónoma cuando consideres que está lista en lugar de esperar mi aprobación explícita, igual que hemos hecho en otras implementaciones». This changes the human-approval wait only; no acceptance gate is removed.

## Initial architecture findings

The production menu is a separate iframe running a native WebGL renderer. Its existing camera journeys enter sections; current start/continue production messages immediately remove the iframe. The application has one requestAnimationFrame loop, rendering only while `screen === 'game'`. `WorldScene` owns a Three renderer, NativeSky, Assets and asynchronous load guards. Terrain already uses NativeChunkStream workers; load serializes substantial model/material preparation. NativeSky decodes Radiance and constructs environment pixels synchronously. Crop batch builds all species' stage/bridge geometry synchronously, despite loading diorama needing only maize. These are investigation targets, not evidence of an optimized implementation.
