# Global ambient occlusion and day/night visibility — active scope

User request: add suitable AO throughout Wild Guardians, tune visibility in daytime/nighttime scenes and publish repository screenshots for final user review. Work remains on codex/guardian-3d-animation; no main merge. The desktop goal still references Guardian phase 2 because replacing an unfinished goal is disallowed; that older scope is not declared complete.

## Acceptance matrix

All six biomes: savanna, desert, grand river, mangrove, volcanoes, canyons. Compare identical camera/time/settings with AO enabled and disabled, including near/strategic camera distances. Capture day and night. Preserve biome identity, translucency of vegetation, expressive faces, ground contact and bright magic. Measure incremental GPU/CPU/memory/asset size; do not claim baseline engine performance improvements.

| Group | Existing evidence | Remaining work |
| --- | --- | --- |
| Five work centers | Fresh geometric AO maps, native shader integration, day views; some night views | Suajili night correction, all-culture comparison and destruction/repair AO transitions |
| Village buildings, walls, props | Ground contact approximation and existing lighting | Audit material AO; bake missing local visibility and verify no doubled shading |
| Trees, bushes, grass, crops | Canopy/ground contact shading exists | Audit per-material channels; local AO with transparent-leaf-aware bake and bounded strength |
| Workers, animals, Guardian | Expressive rigs and normal/material treatments | Audit source channels; pose-independent cavity AO, check blink/mouth/cloth/moving joints |
| Terrain and rocks | Texture AO and resident contact atlas already exist | Calibrate combined attenuation, especially mangrove black patches; no duplicate AO |
| Water and translucent/emissive VFX | Separate material paths | Verify contact/lighting consistency; do not multiply opaque cavity AO into water transparency or magic emission |

No group is globally accepted yet. New captures will be stored in this directory. Earlier center evidence remains in docs/renewed-work-centers. Final artistic acceptance belongs to the user after publication.

## First night visibility iteration: Suajili

Same native fixture, biome sabana, culture suajili, time 400, camera zoom 22, frozen simulation. `suajili-night-ao-before.png` is the prior cinematic shader; `suajili-night-ao-off.png` disables only the building AO uniform. Disabling AO lifts some cavities but the roof remains dark. `suajili-night-adjusted.png` keeps AO and raises only the cinematic building night hemisphere endpoints from (.025,.045,.055)/(.075,.13,.18) to (.04,.065,.08)/(.12,.20,.26), while reducing AO strength from .72 daytime to .52 nighttime. Day endpoints, sun, exposure, terrain and village lighting are unchanged by this edit. These are initial settings, pending other cultures/biomes.

The fixture now exposes a building AO toggle whose label refreshes after async model loading. Eight existing cinematic-lighting/AO-bank tests pass, and the adjusted shader renders in the real WorldScene. No all-scene approval is claimed.

## Rendering audit notes

Biomes contain 120 native prop slots (20 per biome), often with multiple LOD descriptors and shared texture sets, rather than individual GLBs. Their loader currently binds position/normal/UV/tangent; additional baked visibility must preserve native layouts and batching. Village/wall packs use separate geometry paths. The custom toon/illustrated shaders recompute lighting, so merely setting Three.js aoMap is not proof that AO reaches final pixels. Terrain already combines texture AO and contact visibility. Integrate at the indirect-light terms and verify each rendered path instead of multiplying final output.
