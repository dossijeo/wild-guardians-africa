# Boundary-preserving geometry draft

The Blender run completed with exit code 0 in the exec call (wall 3.81 seconds, no live PID/ongoing session returned). Loading authorized the CPU interval before pilot 22 and reported a concurrent functional feature build, with no timing interpretation. The run had no warnings and no GPU draws.

Instead of using Blender's ratio-only modifier, this draft splits distinct vertex fans by original face-edge incidence, retains exact source positions/corner IDs, and applies endpoint geometric-quadric collapses to interiors. It rejects link-condition violations, duplicate output faces, nonpositive facet orientation and changes to original chart boundary edges. UV/normal fields are not averaged; their original tables remain separate. A pinched-fan example and connected fan were checked, as were preservation of the square boundary during 4-to-2 triangle reduction and rejection of a closed tetrahedron collapse to duplicate faces.

The draft contains 1399 leaf triangles, versus the budget-derived target 1339. Hypothetical stem-plus-leaf reverse geometry would produce 5548 total triangles versus original 4935, still above the 10% gate. It is not accepted. Per-chart proportional quotas can leave unused geometric reduction in other charts; this count is not a universal minimum. A prepared global-error-queue generator keeps the same boundary/topology constraints and chooses reductions across all independent charts without camera input. At this revision the global generator has not been executed.

The NPZ is 225378 compressed bytes, SHA256 `b02983c67323f8660601d3124ca59968df11afaacbe8ccb6d83a484a8069115a`; decoded arrays total 393234 bytes. The source-table verifier passes P/normal/UV/index bits, original labels, disjoint source chart assignment and proxy finite/index checks. CPU archive storage is not GPU allocation or a web delivery format.

The geometry draft does not yet evaluate its source shading tables. Parameterization, original normal normalization under growth, field lookup, UV/normal-map derivatives, native/morph endpoint continuity and material preservation remain unresolved. Hard boundary preservation does not guarantee interior silhouette, surface proximity or correct growth. No DoubleSide image comparison, FrontSide coverage, shadow gate or GPU benefit is claimed. It must become a complete derived representation and pass DoubleSide quality before controlled FrontSide QA.

Reproduce with the verified portable Blender and the original chart source payload:

```powershell
& .cache/frontside-model-pilot/tools/blender-4.5.9-windows-x64/blender.exe --background --python tools/frontside_blender_boundary_locked_proxy.py
python tools/frontside_verify_chart_proxy.py --report crop-maize-boundary-locked-draft.json --archive maize-mature-boundary-locked-draft.npz --storage crop-maize-boundary-locked-storage.json
```
