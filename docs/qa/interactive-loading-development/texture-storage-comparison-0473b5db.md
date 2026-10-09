# Native texture storage attribution

Sequential New Game contexts 73/74, feature runtime `3a14523b` / QA `0473b5db`, archived control `cdb822f5`. Sabana/Mapungubwe/seed712/media/1280×720. Same final camera; both complete without errors and explicitly dispose, lose their context and close. The probes include buffer binding queries, so timings are excluded from acceptance.

`TextureRequests` records `createTexture`, binding changes, storage commands and explicit deletion. It makes no GL binding queries or GL-error polls and is installed after renderer construction. Its metadata is not physical VRAM. Texture storage command multisets at the final visible world differ as follows (control has no excess):

| Excess feature objects | Storage command dimensions | Internal format | Mip levels |
| ---: | --- | --- | ---: |
| 2 | 1×1 | DEPTH_COMPONENT24 (33190) | 1 |
| 2 | 2048×2048 | SRGB8_ALPHA8 (35907) | 12 |
| 3 | 1024×1024 | RGBA8 (32856) | 11 |
| 1 | 2048×1024 | RGBA8 (32856) | 1 |
| 3 | 35×35 | RGBA8 (32856) | 1 |

The RGBA/sRGB texel dimensions imply **69,919,760 B nominal four-byte texel capacity** including the recorded mip levels, excluding the two depth objects. This is an arithmetic storage-recipe comparison, not measured allocation, physical VRAM, total RAM or a simultaneous GPU-memory peak. It demonstrates why the earlier buffer-only delta cannot establish memory neutrality.

Asset-owner metadata independently shows that the feature initialized both crop base atlases (2048²), both normal maps (1024²) and the borrowed canyon-earth texture (1024²), while the empty New Game control left both crop atlases/normals uninitialized. The diorama-interactive sample initially initialized one crop base/normal pair and the earth texture; the other pair appears during world preparation, where the texture uploader collects compiled sampler references even from zero-count crop instances. Geometry/material compilation is a separate requirement from uploading a texture on an empty batch. A proposed count-zero upload filter is not part of this frozen evidence and still requires native resource, first-crop and dense regression testing.

The 2048×1024 extra storage is consistent with warming both day and night sky panoramas; this serves the native skybox/day-night handoff requirement. Remaining small mask/depth objects and exact ownership outside the asset set require additional attribution. Multiset subtraction cannot uniquely assign identical-format objects to a semantic owner; do not infer an asset ID from subtraction order.

After explicit disposal, tracked buffer storage is zero in both reports. Texture command records without explicit deletion remain: feature six, control five. Both contain five 12×12 RGBA32F commands (34836); feature additionally has one 1×1 depth command. Their contexts are confirmed lost, which releases context resources but is intentionally not represented as `deleteTexture` by this probe. This is not proof of an app-level repeated-load leak, nor proof that all resource owners explicitly disposed; lifecycle coverage remains open.

Reports: `texture-storage-feature-0473b5db.json`, `texture-storage-main-cdb822f5.json`; `resource-probe-directed-checks.json` covers four attribution/hook tests and 159 HTML / 156 inline-script parse checks. No PR acceptance or performance claim follows these resource observations.
