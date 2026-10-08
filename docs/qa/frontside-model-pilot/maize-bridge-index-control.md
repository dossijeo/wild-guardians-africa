# Maize transition: indexed source control

This is a reproducible DoubleSide control of the real `puente_maiz_3_4` runtime bridge. It does not produce a repaired asset or approve FrontSide. The original GLB, bridge metadata and viewer frozen at `889c152c` remain unchanged.

`node tools/frontside_bridge_index_cpu_audit.mjs` loads the original geometry and region mappings into the actual `createCropBatch` implementation. `indexedBridgeControl` deduplicates corners only when all 22 Float32 lanes match bit for bit: position, normal, UV, root, peer root, spin and part. It preserves triangle/corner order and borrows the live instance attribute. Signed zero and different region drivers remain distinct. Unknown static attributes and morph attributes are rejected rather than silently lost.

The audit changes native growth from .7325 to .736 and clock from 12.5 to 13, checks expanded corner attributes, and confirms the shared live `iBridge` binding. Material and shadow sides remain DoubleSide. Three unit cases additionally cover driver distinctions, signed zero, attribute ownership and unknown attributes.

| CPU static storage | Original | Indexed control |
|---|---:|---:|
| Vertices/corners | 17,844 | 11,124 |
| Attributes plus indices | 1,570,272 B | 1,014,600 B |
| Index storage | 0 B | 35,688 B |

The 35.387% reduction applies to these static typed arrays. It excludes instances, materials, textures, programs and original/candidate coexistence. It is not measured resident GPU memory, vertex invocation count or GPU improvement. Changing an index stream can affect rendering execution even when corner attributes match, so an actual DoubleSide comparison must precede any FrontSide comparison.

The report in `maize-bridge-index-control-audit.json` records input SHA256 values and the source corner stream hash. The CPU command completed with exit 0 in 2.125 seconds including the three unit tests. No GPU context or Blender process was started for this audit.

The next geometric experiment can use this lower static cost as a baseline while retaining original region roots, peer mappings and growth behavior. Any replacement must supply new face labels that correspond to its actual triangles. Region boundaries may be internal interfaces and are not automatically holes to cap. Geometry selection must follow source structure, independently of training cameras. Actual rendering, growth continuity, resources and net GPU benefit remain pending; visual differences follow policy 3 and require perceptual review rather than an automatic pixel threshold rejection.
