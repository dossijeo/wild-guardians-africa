# Sabana spatial-authority prototype — experimental

This prototype is isolated on `codex/hierarchical-navigation-openra`. It changes no production generator, navigation entry point, gameplay rule or save file. Build the binary with `tools/build-spatial-savanna-wasm.sh` under Emscripten, then run `node --test tests/spatial-savanna-prototype.test.js` and `node tools/experiments/benchmark-spatial-savanna.mjs`.

## Existing responsibilities and proposed replacement

| Current code | Current responsibility | Spatial-core direction |
| --- | --- | --- |
| `src/world/terrain.js` `TerrainField` | Seeded relief, fluid, settlement terrain, surface and slope | C++ height/fluid source, exposed as visual buffers and direct logical queries |
| `src/world/terrain.js` `scatterWorld` | Seeded positions and asset slots for visual props; `Navigation.chunk` regenerates these to collide | C++ prop records used by both the render adapter and collision occupancy |
| `src/rendering/chunk-data.js` / `chunk-worker.js` | Rebuild terrain mesh, water, ground mask and props in a worker | Worker requests a WASM chunk and passes its render buffers to Three.js; thread ownership and transfer costs still need design |
| `src/world/navigation.js` | Calls `TerrainField`, `propsAt`, structure collision, `walkable` and `segmentClear` | Authorized topology events update the C++ occupancy/sector graph; JS retains movement and gameplay decisions |
| `src/world/hierarchical-wasm/lazy-sectors-adapter.js` | Repeatedly calls JS geometry to rasterize each sector | The C++ generator fills the existing sparse-sector core directly |

Three.js meshes, textures, LOD, lighting, asset pack slots, animations, UI, audio and the game simulation remain JavaScript responsibilities. This experiment uses the existing C++ sparse-sector graph and route function in the **same WASM module** as one deterministic Sabana chunk generator. No JS geometry callback is made during generation, sector construction or route search. Render heights, vertex colors, river occupancy and 20 asset-slot prop positions are read from WASM buffers. The adapter constructs `THREE.BufferGeometry` for terrain and river, plus instance records for the game's Sabana models. A local static passability and directed-edge raster is generated once per navigation profile; a wall edit applies its dynamic occupancy only to affected sectors. Worker and animal profiles can each be queried, currently by rebuilding this single module's navigation profile.

## Reproducible measurements

The [ABBA report](spatial-savanna-prototype.json) uses Sabana seed 712 and one 48 × 48 m chunk on this host. It compiles each WASM module before timing, then measures visual preparation plus 16 sectors of animal-radius navigation. The baseline builds the current visual chunk and separately asks JS geometry to sample the existing sparse C++ graph. Both rows include preparing the visual data, not just A*.

| Pipeline | Initial visual + navigation | Navigation portion | JS geometry calls while loading sectors | Visible props |
| --- | ---: | ---: | ---: | ---: |
| Current JS world + sparse WASM | 339–454 ms | 280–373 ms | 2,789 `walkable`; 5,202 `segmentClear` | 202 |
| C++ shared spatial source + sparse graph | 30–47 ms | 27–30 ms | 0 | 236 |

The prototype binary is 47,390 bytes and each instance initially reserves 4 MiB of WASM linear memory. Its C++ wall add/remove operation took about 0.2–0.7 ms per edit and rebuilt only the intersected sectors. The current baseline's wall edit was **not** benchmarked in this report, so the edit times are not comparative. Route batches found 3 and 6 paths respectively because the worlds are intentionally different; route counts must not be compared as an algorithm-quality score. Tests confirm deterministic regeneration, matching adjacent terrain seams, a shared visible-prop collision point, river occupancy exposed to the renderer, valid physical edges for returned worker and animal routes, and wall closure/breach recovery.

The browser QA page at `tests/browser/spatial-savanna-prototype.html` loaded the actual Sabana biome asset pack into the 20 instance slots and rendered 236 props, the terrain and a river from the prototype's WASM data. Manual inspection in the in-app browser showed the river and props in the expected positions without JavaScript errors. No screenshot was saved from this browser session, so visual acceptance remains open. The river edge is visibly stepped and the terrain is less detailed than production.

## Limits before any game integration

This is evidence that eliminating repeated JS geometry queries can be valuable, **not** evidence of a complete or visually equivalent Sabana replacement. The C++ recipe uses simplified relief, river and prop placement. Its river mesh is a flat occupancy-cell preview, not the production water treatment. It lacks ponds, settlement flattening, ground mask, monument layout, cross-chunk prop footprints and full asset transform/variant rules. Its indexed Three.js ground geometry also performs less visual work than the current production chunk builder. No screenshot or device QA has been accepted. The single sparse graph is rebuilt when switching worker/animal radius; a game implementation needs bounded, persistent per-profile graphs without duplicating the procedural authority. Browser/Web Worker transfer, memory growth, terrain residency, cross-chunk routes and save-version migration remain unmeasured.

The next gate is a visually representative Sabana chunk with shared-edge prop collision and production-level river/ground treatment, plus captured rendering QA and matched worker/animal route cases. Only then can a full chunk-to-first-route comparison justify extending the generator to the other five biomes and running sustained 14-night campaigns. The existing JS generator and navigator remain untouched until those gates pass.
