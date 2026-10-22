# Native river yard islands

The retained visual yard mask is now a BiomeGround option: `visualLab=global-lighting&riverYards=islands`. Combine with `riverSoil=1&grassCoverage=continuous&skyAtmosphere=clouds` for the currently retained native Grand River composition. Default remains unchanged. Terrain geometry, simulation and navigation are untouched.

The native mask preserves RGB channels, approach corridors and the existing island recipe. Only visual wear alpha changes. The former QA global lookup is replaced by an injected existing renderer source (`revision`/`snapshot`). Settlement data is cached until its terrain revision changes; no Engine internals are imported and no per-frame snapshot polling is added. Without a source, the existing field settlement fallback is used. Spatial session already increments terrain revision and invalidates affected chunks when a village is installed.

## Verification

`node tools/experiments/capture-river-yards-native-20261022.mjs`
`python tools/experiments/audit-river-yards-native-20261022.py`

Vite 5190, seed 712, media, 1280x720, visual time 2, three camera poses, day 150/night 350. Both arms use native grass; only yard-mask implementation differs. Twelve screenshots / six pairs: all pixel-exact, same calls, triangles, instances, camera and time, no GL/console errors. Native arm does not use the QA yard patch. Retained QA harness import was aliased to avoid a name collision with the new native import; an initial capture startup failed on that collision and was rerun successfully.

Seven tests pass:
`node --test tests/river-yard-islands.test.js tests/global-river-soil.test.js tests/continuous-grass.test.js tests/continuous-grass-river.test.js`

Mask tests compare all bytes against retained QA across three adjacent chunks/two settlements, preserve input and RGB, and verify alpha never increases. Snapshot test proves one read across 25 same-revision accesses and a new read after revision change. This is cache behavior evidence, not CPU time or FPS evidence. No shaders, draw calls, geometry or GPU allocations were added by the mask integration. Earlier moving-camera grass benchmark remains applicable background, not a fresh benchmark of mask generation.

## Limits / recommendation

Keep opt-in. Existing capture placement does not test a newly founded village during gameplay; that real event/streaming case remains pending despite unit revision coverage and inspection of the spatial invalidation path. Very-low/portrait and long-run streaming also remain pending. River material and coverage no longer require QA source replacements for the retained composition; other biomes and the full visual goal remain unfinished.
