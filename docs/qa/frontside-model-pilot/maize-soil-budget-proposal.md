# Soil-only derivative: training quality pending

No production asset or material is changed. This is a new proposal after the rejected stem and leaf reductions, with their reports retained. It uses no recorded view masks or reserved poses. Original soil boundary fields and every original stem/leaf triangle are constraints; interior triangulation and interpolated fields are explicitly derived, not claimed identical.

Blender 4.5.9 LTS, build `8bf95cbd38d1`, runs `tools/frontside_blender_soil_budget.py`. Source SHA256 remains `be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef`. The predeclared triangle limit allows at most 771 soil triangles after retaining all 824 stem reverses and all 3009 original leaf triangles. The chosen modifier ratio is 771/1102; its result contains 770 soil triangles. Boundary weighting is a heuristic, so explicit postchecks determine retention.

| Proposal | Soil triangles | Missing geometric boundary edges | Missing PN/UV boundary edges | Status |
|---|---:|---:|---:|---|
| NONE | 770 | 39 of 122 | 92 of 204 | Structural rejection |
| HIGH_INTERIOR | 770 | 0 of 122 | 0 of 204 | Structural/resource checks only |

HIGH_INTERIOR archive SHA256 is `e1e5886daaef7291b0553c46ea7e985661afb5e015cae7737958742bbd0185ff`. Repeated Blender executions produced the same archive. The payload contains 3833 retained original faces, their original face IDs, bit-exact PN/UV corners and driver labels. Soil labels remain zero. Exact original triangle correspondence restores 1308 corner normals; unique exact P/UV anchors restore another 567. No ambiguous anchors are resolved. The remaining 435 transported interior corners still require material/normal-map quality validation. Maximum sampled geometric distance is 0.0448788 m; it does not bound image error or prove equivalence.

| Storage/work | Original state | Prospective complete stem reverses |
|---|---:|---:|
| Triangles | 4935 | 5427 (+9.9696%) |
| Unique PN/UV rows | 8983 | 8503 |
| Attribute bytes | 287456 | 272096 |
| Index entries, uint16 | 14805 | 16281 |
| Attribute + index bytes | 317066 | 304658 (−3.9134%) |

The Double-only training constructor submits 4603 forward triangles; the 5427 count is prospective, not the geometry drawn in this first quality screen. Shared index/attribute bytes exclude instance drivers, textures, GL overhead and extra draw/program costs. Index entries are not measured vertex shader invocations. No derived GLB/web compression has been exported, no category-wide buffers computed and no GPU memory or timing measured. These remain gates after visual viability; original raw-Front benchmark savings are not inherited.

`node tools/frontside_derived_batch_contract_verify.mjs --soil` verifies eight native batch growth/clock cases (four with the mature mesh active), shared live instance/iGrowth objects and values, unchanged growth hook source/uniforms, actual prospective index/attribute byte totals, and rejection of modified retained UV. Node textures are removed solely for this offline check: it does not validate rendered maps or continuous growth/bridges. All original bridge geometry remains unchanged; explicit bridge correspondence is still necessary before any adaptation.

The frozen native TRAINING screen uses four arms: original DoubleSide, indexed original DoubleSide, soil derivative DoubleSide, and the same derivative partitioned into two DoubleSide groups. It retains the existing quantitative controls/gates, original sky/material maps/shaders and effective shadow-draw witnesses. It must stop on source invalidity or quality failure. This first screen is one guided training view, not independent multiview acceptance. No FrontSide arm, timing, category approval or production promotion is enabled.

URL: `http://localhost:5284/tests/browser/frontside-crop-visual.html?blenderSoilReduction&derivedContractAudit&limit=1&cpuCampaigns=20024%2F49032%2F41320%2F41304-active-inventory-required`. Inventory must be verified immediately before drawing; this label is not proof of current process state.

## Other representative diagnostics

`frontside_crop_closed_subset_audit.py` checks mature cotton and sorghum without changing any geometry, attributes, labels or materials. Exact-coordinate connectivity finds no whole closed positive-volume component satisfying all normal/winding tests. Cotton has 3276 triangles, 68 boundary edges, 73 non-manifold edges and four winding conflicts; sorghum has 6396 triangles, 258 boundary edges, 534 non-manifold edges and 26 winding conflicts. Neither has complete exact-coordinate coincident triangle groups. Original corner normals agree with their own geometric faces; same-directed interface edges do not justify blindly flipping surfaces. Regional driver cuts are separately reported and may be intentional attachments. This conservative failure is not evidence that FrontSide requires universal closedness or that those crops cannot be adapted.
