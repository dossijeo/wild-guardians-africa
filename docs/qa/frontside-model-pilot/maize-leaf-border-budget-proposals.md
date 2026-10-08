# Original stem with conservative leaf-budget proposals

Status: **OFFLINE REJECTED STRUCTURAL PROPOSALS**, no native quality campaign, no runtime activation and no GPU timing. The original 824 stem triangles and every soil/stem P/N/UV corner remain bit-exact. All stem reverses would be included, so no discrete reverse-face visibility mask is proposed for the growth continuum.

The unchanged +10% state triangle gate permits 2678 leaf triangles: floor(4935×1.1) − 1102 soil − 2×824 stem. The reduction ratio is derived from this resource equation, not a selected camera or old held-out result. Seven original leaf drivers are processed independently. Each receives its original UV layer and a POINT copy of original normals; unchanged full triangles and unique P+UV anchors restore original normal bits. Unmapped new fields are explicitly transported/normalized derived values, not claimed original chart correspondence.

Two weight conventions are predeclared to inspect Blender weighting. Weighting is **not a hard boundary lock**; a separate exact P/UV edge-preservation check determines structural failure. Both original proposals and their failure counts are retained.

| Proposal | Leaves | Full original-stem bilateral triangles | Shared state bytes | Missing constrained edges | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| High weight boundary | 2673 | 5423 (+9.8886%) | 309082 | 927 | Resource pass, boundary fail |
| High weight interior | 2947 | 5697 (+15.4407%) | 319782 | 138 | Triangle and boundary fail |

The first archive is `2ba6a9ee61715ef3fdf84f5f6b97ce6f56eeec3aebc9955af939f2347f32e6c7`; the second is `f97fa41208ad1935b3fac017ffec9ceafb57582967b32bc9d1b9cd594b2f0561`. Repeated generation preserves their hashes. Sampled source-surface maxima are 0.0347626 m and 0.0213325 m; those samples are not bidirectional Hausdorff/image guarantees. No candidate is extended to visual acceptance after failing the structural constraint.

The conservative edge constraint includes indexed cuts and UV charts, not just physical silhouettes. The source has 5806 constrained distinct P/UV edge keys inferred from indexed open/non-manifold edges. Separate exact-domain ownership counts, accumulated per original driver, are:

| Endpoint equality domain | Single-owner edges | Two-owner edges | More-than-two-owner edges |
| --- | ---: | ---: | ---: |
| Position | 756 | 4046 | 53 |
| Position + UV | 5805 | 1611 | 0 |
| Position + normal + UV | 5807 | 1610 | 0 |

Thus most cuts are chart/attribute interfaces rather than geometric boundaries. The script does not quantize coordinates, weld the source, treat closedness as a universal FrontSide requirement or infer inviability from this conservative filter. Conversely, preserving only the 756 physical coordinate borders would not establish preservation of the thousands of UV/normal interfaces. No such constraint is silently removed to accept a weighted result.

The next viable reconstruction must preserve those fields through explicit correspondence, or demonstrate an equivalent controlled field reconstruction under the original image gates. A generic nearest-source face or merely unchanged bounding box is insufficient. These leaf models remain DoubleSide and stem reverses add vertex/index work and draw groups, so neither proposal inherits the rawFront GPU ceiling. Bridges and all growth stages require new mappings even if a future mature-state pilot passes.

## Conditional chart topology bound

`frontside_leaf_chart_lower_bound.py` analyzes the immutable source, rather than a rejected view. It builds exact P+UV and P+N+UV edge-connected charts per original driver. For a component to receive the disk bound, the audit verifies Euler characteristic 1, one closed boundary loop, manifold vertex links, no edge with more than two owners and no degenerate attribute-key triangle. All 1425 P+UV charts and all 1426 P+N+UV charts satisfy those checks; there are zero unresolved components.

If every original chart boundary edge/vertex and each disk topology are retained, a triangulated chart requires at least B−2 triangles for B boundary edges. Both domains yield a total leaf lower bound of **2955 triangles**. This permits at most **54** removals from the original 3009, whereas the full-original-stem proposal needs **331** removals to reach 2678. The conditional minimum state is therefore 1102+1648+2955 = **5705 triangles**, above the unchanged 5428-triangle state limit. Geometry curvature and exact interior normal/UV interpolation may require more triangles than this topology bound.

This is an explicit limit of the design retaining every chart interface literally, not universal FrontSide impossibility and not a claim that weighting alone proves the bound. An alternative model could reconstruct the source field across a different geometric triangulation, but it would need an explicit equivalent chart/normal sampling method and separate resource/image proof; silently discarding or interpolating across charts would violate the current constraints. No conditional proof authorizes changing a gate or source mapping.

Reproduction:

```powershell
& .cache/frontside-model-pilot/tools/blender-4.5.9-windows-x64/blender.exe --background --factory-startup --python tools/frontside_blender_leaf_border_budget.py
python tools/frontside_leaf_chart_lower_bound.py
```

No source GLB, rig, original bridge data, UV/material library or production file is changed.
