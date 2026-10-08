# Conservative restoration of the original stem field

Status: offline candidate, **NOT APPROVED**. Neither frozen `a73ad920` fixture imports nor production assets are changed by this proposal.

The read-only Blender field audit finds that the `.75` and 658-triangle pilots change every inspected normal at an unchanged original position and UV. For the 658 pilot, 1742 stem corners have exactly the original float32 P/UV values; the smallest angle to a matching original normal reaches 1.300650 rad (p99 0.749764). This is an attribute contract difference, not a demonstrated cause of the native RGB failure. Nearest-surface diagnostics are deliberately not used as a transfer rule: coincident interfaces and UV charts can supply incompatible candidates.

`frontside_restore_stem_anchor_normals.py` reads the immutable 658 archive `cb6b139a611ea35f6cbf5a5c80c2fc9d1fed8999ec477b70b68e560a3586dbc9` and restores original NORMAL float32 bits only where the exact P+UV byte key has one distinct original normal. It restores 1738 corner normals. Four corners have multiple distinct original normal values and 232 have no exact original P+UV key; both sets remain unchanged and are listed in the receipt. No view mask, nearest triangle tie winner, normal zeroing or guessed chart resolves them.

The resulting archive is `1a0b22844303e38748162a03c2cdb333e671caccd092de68cd3926e78262a8e8`. Assertions preserve all candidate positions/UVs, triangle order, face labels and every soil/leaf attribute bit. Original GLB and input candidate remain untouched. These new derived face IDs are not evidence of correspondence to original stem faces.

| Projection for one mature state | Original | Candidate with all stem reverses |
| --- | ---: | ---: |
| Triangles | 4935 | 5427 (+9.9696%) |
| P/N/UV plus shared indices | 317066 B | 313938 B (−0.9865%) |

The bytes estimate deduplicates complete P/N/UV rows, then shares that buffer between forward and reverse index groups. It is not category memory, a compressed GLB size, GPU allocation measurement or a benefit claim. Restoring identical original field bits permits more full-row welding than the unrepaired 658 field. Bridges, all growth states, shader derivatives/TBN, draw calls and effective shadows remain outstanding.

More specifically, 8793 complete attribute rows occupy 281376 B; 5427 triangles at three uint16 indices occupy 32562 B. Forward-only DoubleSide geometry would use 4769 triangles and 28614 B of indices, giving 309990 B. The 658 geometric reverses add 3948 B of indices with shared attributes. This does not remove their vertex processing: the bilateral stem submits 1316 triangles instead of the original 824. Separate forward/reverse shader recipes may add draws and repeat vertex invocations across groups, which an attribute-byte comparison cannot measure. Soil and leaves remain DoubleSide in this partial proposal. The original rawFront benchmark culls those surfaces too, so its 9.09% crop-only total / 14.14% color saving cannot be inherited by this candidate. Net timer-query evidence including all groups and effective shadows is required before any expansion.

An independent Blender transport audit isolates two stages without exporting a candidate. Immediately after setting the source custom normals, the maximum angular difference from raw original NORMAL is 0.001204 rad (p99 0.0000913). After the 658-face Decimate modifier, custom corner normals differ from a transported generic POINT copy of the raw normal field by up to 1.300650 rad (p99 0.818213). The generic attribute is bit-exact before the modifier, but its new values have lengths from 0.962153 to 1.000000123 and do not prove valid chart correspondence after interpolation. Thus the generic field is a useful transport diagnostic, not a replacement normal recipe automatically accepted for new corners. No source or production shader was changed.

The separate exact-triangle correspondence audit finds 464 triangles with a unique original normal field for all three P/UV corners in cyclic forward order; 194 triangles have no full original triangle match. Of interest, the two triangles containing the four ambiguous anchor corners match original faces 3145 and 3331 individually, each with one distinct corner-normal field. That gives a stronger, reproducible face-level correspondence for a future variant rather than choosing one of the competing vertex normals. The current `1a0b2284…` archive still leaves those four values unchanged; this diagnostic neither alters it nor supplies correspondence for the 194 newly formed triangles.

Reproduction from this worktree:

```powershell
& .cache/frontside-model-pilot/tools/blender-4.5.9-windows-x64/blender.exe --background --factory-startup --python tools/frontside_blender_stem_field_audit.py
python tools/frontside_restore_stem_anchor_normals.py
& .cache/frontside-model-pilot/tools/blender-4.5.9-windows-x64/blender.exe --background --factory-startup --python tools/frontside_blender_stem_normal_pipeline_audit.py
python tools/frontside_stem_triangle_correspondence_audit.py
```

The first native check must compare this derived geometry using DoubleSide to the unchanged original, with the existing source controls, quantitative color/alpha/regions gates and contract audit. Any alpha failure of the unchanged 658 geometry cannot be repaired by changing normals. Only if image preservation succeeds may an independent FrontSide experiment proceed; previous reserved profiles cannot be reused as acceptance data. No threshold, source-control envelope or resource gate is widened for this experiment, and a pass in one training view would not establish multiview, growth, shadow or GPU acceptance.

The disabled native fixture now accepts a separate guarded `stemAnchorNormals` flag, requiring `blenderStemReduction`, `stemBudgetMax`, `derivedContractAudit` and `limit=1`. All four arms remain DoubleSide: original, exact indexed original, restored field, and the same restored field in two groups. Archive SHA, source SHA and restoration/input recipe are checked before construction. Native contracts and unchanged gates are retained. This training sample diagnoses attribute preservation; since position/UV and winding are unchanged, the earlier 658 alpha rejection is explicitly expected to remain and cannot qualify the candidate by better RGB alone.

```text
http://localhost:5284/tests/browser/frontside-crop-visual.html?blenderStemReduction&stemBudgetMax&stemAnchorNormals&derivedContractAudit&limit=1&cpuCampaigns=20024%2F49032%2F41320%2F41304-active-inventory-required
```

HTTP validation served the exact 2323730-byte archive and expected SHA. The offline native `createCropBatch` contract verifier (`node tools/frontside_derived_batch_contract_verify.mjs --anchor-normals`) passes eight growth/clock samples, four with the mature mesh active. Live instance/growth objects, values and shader-hook strings remain equal; actual shared bilateral state bytes match 313938. Textures are stripped for Node loading and no raster/shadow/GPU gate is thereby satisfied. The original 658 and .75 receipts are not overwritten.
