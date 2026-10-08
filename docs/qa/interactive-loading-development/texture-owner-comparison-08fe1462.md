# Loading texture ownership / deferred empty-batch uploads â€” native QA

Source: `08fe146200801211bda5f647331f74eee3d9f082`. Two sequential native IAB contexts, 75 (New Game) and 76 (archived dense Continue), 1280Ã—720, media/Sabana/Mapungubwe. Both were disposed, confirmed context-lost, and closed before releasing GPU. These are resource-instrumented functional observations, not FPS/GPU benchmarks: BufferRequests performs binding queries and modifies scheduling. Historical CPU campaigns remained active. No production assets were resized, recompressed or changed.

## Native ownership observations

The diorama creates local Texture objects with the original pixel Source and identical sampler settings. Its GL atlas, normal and soil storage IDs were respectively 4, 5 and 6 at the first recorded stage in both contexts.

| Observation | New Game | Dense Continue |
|---|---:|---:|
| Initial diorama GL objects | 8 | 8 |
| Highest GL object count in recorded milestones | 65 | 111 |
| Controls-ready GL objects | 62 | 110 |
| Initial GL storage surviving handoff | Sky/environment; 4/5/6 deleted | Sky/environment; 4/5 retained, 6 deleted |
| Requested buffer peak | 68,562,286 B | 94,956,936 B |
| Tracked buffer bytes after explicit disposal | 0 | 0 |
| GL objects without explicit delete after disposal | 6 | 6 |

Dense crops still use the exact original IDs 4/5 after the local diorama Texture objects are disposed. This is direct evidence of native storage sharing and retention by the world in this particular scene. New Game has no crops, so those two storages and the local ground are released instead. The latter does not imply CPU bitmap deletion: original Assets retain their Source and pixel ownership. No unhandled errors occurred, and ready/camera/logical/restoredLogical checks passed in both scenes.

The six remaining explicit-delete records are the previously observed five 12Ã—12 RGBA32F entries plus a 1Ã—1 depth entry. Context loss was confirmed after disposal; implicit context-loss release is not represented by deleteTexture records. These observations neither establish an application leak nor prove complete RAM/VRAM neutrality.

## Compared with previous resource observations

Against the earlier New Game feature observation `0473b5db`, controls-ready no longer records two 2048Â² sRGB mipmapped storages and three 1024Â² RGBA mipmapped storages. One additional 35Â² RGBA entry appears. The absent definitions correspond to the unused second crop-atlas pair and the disposed diorama-only pair/soil; dimensions alone are insufficient to match individual assets without the recorded IDs and ownership observations.

The removed RGBA/sRGB definitions sum to 61,516,452 nominal bytes under a four-bytes-per-texel mip recipe. This is arithmetic over reported storage definitions, **not physical VRAM, total RAM, simultaneous peak residency or a measured memory saving**. Compared with the previous archived main New Game observation, the final multiset has only one extra 2048Ã—1024 RGBA definition, four 35Â² RGBA definitions and two 1Ã—1 depth definitions; its RGBA-only nominal excess is 8,408,208 bytes. Sources/driver layout, initialization scheduling and the different small masks limit comparisons with historical controls.

Requested buffer peaks remain unchanged relative to the previous feature resource scenes. This change does not resolve their approximately 9.4/10.7 MiB excess against earlier main controls, nor provide total peak RAM/VRAM measurements.

## First native crops after handoff

New Game used ordinary paid Game commands in its disposable QA farm: a centre was built, then one native maize and one native millet were planted at legal sites. Both commands added exactly one plant and rendered without errors. The first command-plus-draw measured 115.1 ms for maize and 58 ms for millet under instrumentation. Those figures are diagnostics, not GPU frame measurements. They leave a **deferred first-crop stall gate open**, especially because New Game releases the diorama maize atlas at handoff. An uninstrumented first-crop observation is required before accepting this ownership/upload policy for release; texture release alone is not acceptance.

## Evidence

- `texture-owner-new-game-08fe1462.json` and `.png`: loading stages, asset inventory, storage IDs, ordinary paid commands, final disposal.
- `texture-owner-dense-08fe1462.json` and `.png`: archived save hash, native readiness, storage ownership and disposal.
- Prior controls: `texture-storage-feature-0473b5db.json`, `texture-storage-main-cdb822f5.json`, `resources-dense-feature-652aa66e.json`, `resources-dense-main-cdb822f5.json`.

Open gates: uninstrumented first crops, cancellation/repeated-load ownership, comparable loading performance against current main, actual-menu night/autoplay/mobile/reduced-motion regression, total peak RAM/VRAM scope and final build/CI. No PR or release approval follows from these probes.
