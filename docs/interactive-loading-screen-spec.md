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

## User visual-polish extension (2026-10-08)

This mandatory extension was relayed by root after the initial implementation pilots. It belongs to the same `feature/interactive-loading-screen` branch and must be complete before PR/merge, after the current responsiveness optimizations. All original acceptance requirements remain in force.

- Keep a small maize/soil diorama and the exact shared original skybox. Soil opacity blends softly into inexpensive fog around/behind the patch, with no sharply cut platform or flat blue backdrop. Day fog is warm cream/sand; night fog is dimmer blue-grey, coherent with sky and lighting. No distant mountains, trees, buildings, decorative assets or expensive volumetrics in this scene.
- Provide a minimal responsive bottom UI respecting safe areas and planting visibility/input: “Preparando tu mundo...” / “Preparing your world...”, actual percent and a thin soft-green smoothly updated bar sharing maize progress. Touch help: “Toca la tierra para plantar más maíz” / “Tap the soil to plant more maize”; mouse help: “Haz clic en la tierra para plantar más maíz” / “Click the soil to plant more maize”. Use existing fonts; no opaque panel.
- Phase labels reflect real completed/active work, never arbitrary timers: preparing terrain, awakening nature, giving life to the world, everything ready. Provide Spanish and English.
- New Game uses the starting day. Continue obtains saved time early where practical, so the first diorama and sky match the saved time and handoff does not jump exposure/color. Use a coherent fallback if early retrieval would require substantial world initialization; do not complicate loading solely for the clock.
- Capture actual updated day/night and portrait/landscape scenes with differentiated names in `docs/qa/interactive-loading-development/`. Verify fog/edges, light/dark readability, visibility throughout growth, actual percent/bar, click/touch, and no performance/GPU-resource regression.
- This polish must not change procedural generation, gameplay or save data.

Autonomous root review/merge remains authorized only after the original and extended acceptance gates pass.


### Additional authorized audio requirement

Use existing AudioManager, buses and catalog for one loading ambience loop: SFX 004 by day or 005 by night, chosen from the diorama's real initial/saved time. Play SFX 028 once per successful player-added seedling; initial plants and catch-up growth emit nothing. Respect mute/volume/autoplay and a first gesture when needed. Stop loading loops on cancellation, errors and handoff, before world ambience; no duplicate sources. Integration tests and functional audio/ownership QA remain acceptance gates.


## Additional authorized presentation requirements, 2026-10-08

Retain current artistic direction and UI while resolving loading stalls first. Increase maize framing presence by 20-30% via camera/FOV only, without model scaling: four initial plants visible, empty soil for interaction, less foreground waste, substantial native sky, and no mature clipping in portrait/landscape. Add a bounded sinusoidal ambient orbit of +/-8-12 degrees over 15-25 seconds at constant distance around the crop focus, with negligible vertical motion. Pause/stabilize on pointer/touch, resume gradually after brief inactivity, raycast using the current camera, and progressively stop before handing the actual pose to the cinematic without jumps. Add gentle native GPU leaf movement with plant-specific phases and fixed bases including seedlings, without physics or per-plant CPU loops. Keep fog static unless an extremely subtle uniform-only variation remains cheap and coherent. Evaluate a very faint neutral/cool diffuse night fill without extra shadow work or overbright soil. No particles, new textures/clouds, skybox or real-world lighting changes. Preserve all real-progress phase/percentage/bar/help/cancel ES/EN/safe-area UI. Use the existing RAF/renderer/resources with no per-frame geometry/material/texture/buffer allocation or recompilation. Reduced motion disables orbit and reduces breeze/fog variation. Validate day/night, both orientations, small/intermediate/mature crops, planting during movement, completion/cancel and exact final gameplay camera; archive differentiated real screenshots and a brief video if feasible. Compare render/frame cost before/after with no significant regression. These are additional gates, not a replacement for prior performance, lifecycle, integration and compatibility acceptance.


## Additional authorized download-progress requirement, 2026-10-08

The displayed aggregate must include missing asset downloads as well as decoding, world generation, uploads, shader preparation and verified visible readiness. Weight these contributions by estimated total waiting time. Verified cached assets contribute zero download work; missing assets add download time to the total. Do not classify fast fetches as cache hits. Instrument actual bytes/json, GLTFLoader, TextureLoader fallbacks, sky and far-asset requests without a second fetch or duplicate body read solely to measure progress. Use Content-Length/progress and ResourceTiming where available; explicitly report unknown cache classification or chunked/unmeasurable totals. Discovering work can change estimates but must never make percentage regress;100 remains reserved for real world/GPU readiness. Test cold, warm, partially cached and throttled loading, monotonic progress, cancellation and failures. This is another mandatory gate on the same feature branch, not a replacement for earlier acceptance.

Design notes pending implementation: request intervals must account for concurrency rather than simply summing every parallel request's duration. Existing milestone cost estimates should be documented in time units, with network estimates tracked separately. Native application preparation begins during the menu animation, so the request owner must exist before diorama preparation, not after the first loading frame. Browser HTTP cache cannot be inspected ahead of a fetch through normal APIs; a confirmed cache hit requires exposed ResourceTiming evidence or an explicit application cache hit. Unknown data must remain unknown rather than manufacturing a cache decision. Existing cancellation and shared resource ownership must survive instrumentation.

## Current download implementation evidence

Owner starts before menu/diorama preparation; native fetch forwards original body once, GLTF/TextureLoader native callbacks are observed, and original ResourceTiming evidence is retained if parsing outlives the browser buffer. Completed transport stops accruing network time while native parse stays pending. Pending native completion still blocks100%. Concurrent request intervals are unioned. Unknown/cache evidence remains explicit. Initial preparation estimate14s was recalibrated to16s in3a14523b using thirty native-world exclusive-wait proxies;10Mbit/s pending network/latency and missing-size values remain declared estimates, not byte-accurate promises. The proxy excludes overlapping preparation during transfers and is not CPU/GPU total.

Frozen native cold and partially retained subsequent cases, deliberately missing GLB/HDR case, fully cached four-metadata case, real slow cancellation and complete slow world with accepted extra maize have reports in docs/qa/interactive-loading-development. The fully cached metadata case proves0downloadweight but is not a full world cache acceptance test. Native slow completion took74.157s init/78.240s controls with57.8245s transferunion; readiness/camera/logical state/zerohandoffvoices passed. Server counters match211original networkrequests/98,532,608bytes. These do not close actualmenu/mobiletouch, peakmemory, finalpairedperformance or fullcompatibility gates.


## User mockup reference extension, 2026-10-08

The user supplied separate day and night visual references, relayed by root and inspected directly. Original files are preserved in `docs/qa/interactive-loading-development/references/user-loading-day-mockup.jpg` and `user-loading-night-mockup.jpg`; they are reference evidence, never runtime backgrounds.

This latest direction supersedes the earlier strictly bare/no-frame UI preference: use a wooden Cancel control upper-left and a modest wood/vine frame for the main real-progress label/percentage, with a parchment planting hint below in the lower safe area. Reuse existing HUD frame assets/fonts first; provide ES/EN and touch/click wording. Preserve a clear planting area and responsive safe areas, real milestones, percentage/bar consistency and cancellation behavior. Match prominent naturally spaced maize, soft soil-to-fog and warm day/cool blue night with subtle crop-only fill. Keep the original shared skybox and resource lifecycle. Mockup mountains, stars and light shafts illustrate atmosphere; they do not authorize costly new world/volumetric decoration. Any cheap extra effect requires measurement showing no significant regression. This polish follows fluidity investigation and retains all prior performance, memory, integration and QA gates before PR/merge.


## Native frame polish implementation, 2026-10-09

The menu preparation now borrows the retained nine-piece HUD image cache in parallel with the diorama warmup. The loading overlay paints native corner/edge art only after mounting and on ResizeObserver size changes, never in its render/update method. Canvas2D UI creates no WebGL texture or draw call. Shared images remain menu-owned across games; disposal disconnects the observer and drops local references without disposing the cache. Cancel is a wooden control in the upper safe area. The real progress heading/percentage/bar sit inside a modest wooden frame, with the localized planting hint on the existing parchment image beneath. CSS fallback remains coherent if HUD images cannot load; image loading does not block the existing menu animation. All real phase/progress/readiness, audio and input semantics remain unchanged. Native visual acceptance and measured cost are still pending at this source checkpoint.


## Landscape refinement after native frame review, 2026-10-09

Root accepted frame/text legibility but explicitly kept the landscape finish open: the day haze obscured too much native sky, four maize overlapped as two groups and night foliage needed a subtle fill. Candidate changes only the analytic mist vertical taper, compact initial diorama planting positions and the existing maize night-light uniform. No enlarged soil, new textures, geometry, lighting pass or real-world lighting changes. Ground retains its existing night value; all five maize stages and morph bridges receive the same small cold endpoint multiplier through their existing uniform and unchanged shader recipe. Native before/after views, first-frame preparation and visual acceptance remain required; prior captures are preserved.
