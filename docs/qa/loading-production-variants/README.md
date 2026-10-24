# Production loading variant audit

Scope: codex/global-visual-lab, starting HEAD 02cb81d0d. Remove only
unnecessary preparation, retaining selected visuals, pending artistic candidates,
normal gameplay and scheduler compatibility. No merge to main.

## Initial source inventory (not a deletion list)

| Preparation | Current reason | Decision pending evidence |
| --- | --- | --- |
| Actor staging | Animal skinning and private bone textures, including restored actors | Determine reachable species/recipes; cannot remove only because absent from opening view |
| VfxGpuPreload | One representative composition for rigid particles, sprites, ribbons and depth | Gameplay destruction remains required; inspect program keys for redundant variants |
| FluidGpuPreload | Ordinary and, where used, instanced water/lava | Dry opening does not establish unused material |
| Ground cache recipe | Fixed512 material patch before world compilation | Preserve approved Mangrove cache and normal response |
| Whole world compile | Resident and hidden LOD materials | Identify dormant lab-only objects versus later gameplay LODs |
| Smooth obstruction | Streaming policy, enabled by default for Mangroves | Selected smooth transitions must remain prepared |
| Depth capture | Effects use world depth without shadows | Retain real depth recipes; no nested scheduling inside borrowed state |
| Crop depth/shadows | Dormant growth stages and fogless shadow recipe | Later growth must not trigger deferred compilation |
| Far vegetation | Background sprites, ground and mountain preparation | Full selected background must remain visible and measured |

Presence of laboratory source files/imports does not prove that their shaders
are created or compiled. Query-selected branches require runtime evidence.
The dated closure recipe is a measurement starting point, not an authoritative
manifest of every final approved setting. Cross-check newer biome decisions.

## Measurement

QA flag WG_LOADING_PROGRAM_INVENTORY=1 observes shaderSource/attachShader/
linkProgram/deleteProgram on each WebGL canvas. It records shader fingerprints,
defines, names, link stacks and timing without querying link/compile readiness.
No graphics resources or additional shader variants are created by this observer.
Call duration is synchronous CPU/driver wall time, not GPU execution time.
Inventory runs are diagnostic; final performance acceptance requires paired
uninstrumented runs plus first-play frames, active streaming and quality changes.

Initial diagnostic: Mangroves, media, 720p, frozen populated fixture, pthreads,
frame scheduler, full selected background, five seconds of post-ready frames.
Repeat inventory/validation for Sabana, Gran Río, Desierto, Volcanes, Gran Cañón
and all final quality profiles before claiming general applicability.

Pre-existing local edits in GLOBAL-DIRECTION, artwork reports, the loading
harness spatial-failure instrumentation and ground-hybrid measurement are
preserved. No production material or warmup has been removed yet.

## First Mangrove diagnostic (not an optimization result)

Initial ready time39466.050ms,90 link calls across two contexts,89 distinct
shader-source fingerprint pairs. Types: ShaderMaterial28, MeshStandard23,
MeshDepth15, RawShader10, MeshBasic10, MeshPhysical2, LineBasic1, native1.
One link occurs after world readiness: GuardianMesh.initGL on guardian-avatar,
not an unprepared world material. No world link is observed in the short
post-ready frozen window; this does not cover active play or future streaming.
The count is link invocations, not resident program count or GPU compile time.
No variant has yet been proved laboratory-only and safe to remove.
