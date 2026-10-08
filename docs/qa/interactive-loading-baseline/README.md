# Native loading baseline

First desktop pilot before modifying WorldScene, Assets, sky or crop preparation. Runtime source equals main `8105979699c71a33c7cc8cfffd878fc0639bf451`. The feature branch had added only standalone progress/plant logic, tests and contract; production does not import those additions yet.

Fixture: `tests/browser/interactive-loading-baseline.html`, native New Game Sabana/Mapungubwe seed712, quality media, full initial far-world profile. URL `http://127.0.0.1:5290/tests/browser/interactive-loading-baseline.html`. Browser tab1; native IAB. Cache state was not forced cold, device RAM/GPU byte peaks are not measured, and this single diagnostic is not ABBA or a performance acceptance result.

World readiness13,145.6 ms.543 RAF heartbeat intervals; max1,646.3 ms,8 intervals >100 ms. Twelve browser Long Tasks; max1,649 ms at stage warmAnimalGpu. Stage spans include asynchronous waiting and multiple underlying operations; they do not establish exclusive CPU/GPU causality. The biggest synchronous work needs further isolation. Heap sample maximum289,328,352 bytes; this is a coarse JavaScript heap reading at milestones, not process peak RAM/VRAM. Final visible renderer counters161 geometries/55 textures/60 programs; owned asset resources199.

Root confirmed no active root GPU/CPU benchmark; FrontSide agent confirmed no active GPU, Blender or suite during window. Four long-lived Node campaigns were authoritatively confirmed alive immediately before Run:35912 (GranRio/Saheliana),49032 and41304 (GranCanyon/Mapungubwe),41320 (Desert/Musgum). They were neither stopped nor restarted. This background CPU load limits hardware-general claims.

Raw report contains actual milestones, all heartbeat intervals, Long Tasks, camera pose and memory/resource samples. Disposed report additionally confirms renderer context lost after native dispose. Console warnings/errors empty. Tab closed. Screenshot is diagnostic UI, not visual acceptance of a new loading screen. No feature PR or merge is justified by this pilot.
