# Low profile with optional native solar shadows

## Finding and correction

Quality baja disables renderer.shadowMap.enabled in scene.js. Configuring mapSize 768 or 2048 alone does not enable or allocate a shadow map. The preliminary low768/low2048 captures therefore both show shadows OFF: all allocated render targets are null, five pairs are pixel-identical and one differs by one pixel. The low-resolution benchmark was stopped after two A records; it is incomplete and cannot support a resolution-cost claim.

## Actual candidate

This separate QA variant enables native solar shadows, invalidates material programs as the normal quality switch does, and allocates 2048. Both map size and actual render target, enabled state and shadow sampling uniform are verified in six captures. No default change. Geometry, camera, target, time, draw calls and triangles match the unshadowed low captures. The diagnostic counts exclude shadow-pass workload and do not imply equal cost.

Full far vegetation and mountains are included. Three views, day/night, seed712,1280×720. Crowns and buildings gain clear spatial separation. The low profile still has a short coverage distance: shadows do not solve that distant loss of vegetation. Keep the richer medium artwork; this is an optional resource compromise, not its replacement.

See comparison-0/1/2.jpg and the separate low-plus-shadow-cost benchmark. The comparison toggles solar shadows for the whole scene, not fern casting alone. CPU/GPU differences must be interpreted accordingly. Main, simulation, navigation and default quality remain unchanged.

Reproduce sequentially with Vite5190:

```powershell
$env:WG_CARD_TREATMENTS='cards'
$env:WG_COVER_QUALITY='baja'
node tools/experiments/capture-holly-fern-low-plus-shadow-20261023.mjs
node tools/experiments/measure-holly-fern-low-plus-shadow-20261023.mjs
```
