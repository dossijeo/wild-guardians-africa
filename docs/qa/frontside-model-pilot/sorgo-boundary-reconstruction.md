# Sorgo: source boundary reconstruction diagnostic

This is an offline source inspection, not an accepted asset, visual screen or GPU benchmark. Original GLB SHA256 is `be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef`. Source stem selection is faceLabels driver 1 of `sorgo_05_maduro`: 428 of 6396 triangles.

Run from this worktree with the verified portable Blender 4.5.9 LTS:

```powershell
& '.cache/frontside-model-pilot/tools/blender-4.5.9-windows-x64/blender.exe' --background --python tools/frontside_blender_stem_boundary_diagnostic.py
```

The diagnostic joins positions only to inspect BMesh incidence. It verifies original face order and never writes a GLB, welds source attributes, recalculates normals or changes the source. Coordinate equality is geometric inspection; it is not PN/UV attribute equivalence. Source signed-zero field bits remain distinguishable in the closure correspondence.

169 boundary edges form 25 components: 18 simple cycles and seven branched/degenerate components. Twenty other edges have more than two face owners. No simple cycle meets the initial planar tubular-opening witness. The initial report is retained as `sorgo-stem-boundary-tube-only-initial-diagnostic.json`. This narrow negative does not establish that reconstruction is impossible or that every FrontSide surface must be closed.

The second diagnostic considers a separate curved reconstruction hypothesis. It requires a unique original complete POSITION/NORMAL/TEXCOORD_0 tuple at every cycle vertex, coherent directed source boundary, nonintersecting projected ring, n−2 cap triangles, reverse matching of every boundary edge, nonzero face areas and positive original normal dot products at every new triangle corner. No new center vertex, invented UV or normal is permitted in this hypothesis. The normal/field test is structural feasibility, not a substitute for quantitative visual gates.

All 18 cycles fail the unique-field prerequisite. Across their 71 ambiguous vertex occurrences, POSITION bits agree but BOTH NORMAL and TEXCOORD_0 differ. No cap was triangulated or emitted. The current report includes source vertex IDs and differing lanes; these are explicit discontinuities, not a license to average or choose arbitrarily. Seven branched components and the 20 junction edges also remain unresolved.

The next conservative alternative was evaluated with face-corner correspondence rather than a single field per position. Each cap triangle touching an original boundary edge inherits that edge's two original source corner fields; an interior cap corner considers only original neighboring source fields with positive normal dot products. Conflicting boundary constraints and multiple aligned interior fields are rejected, never averaged or guessed. Blender's single triangulation gives 71 proposed triangles, 213 corners: 19 conflicting boundary-field corners, 104 corners whose original normals oppose the cap, seven ambiguous interior corners and 83 uniquely aligned field corners. All 18 rings remain unresolved. No cap is exported or screened.

This is one triangulation, not a search of all reconstructions. It does not establish impossibility. In particular, multi-chart cap seams, projected/self-intersection and global surface ownership, continuously growing bridge correspondences and newly authored cap fields remain unresolved. Changing source normals to force their alignment would invalidate the purpose of preserving the original material field. The geometry proposal therefore stops before a native Double-only comparison rather than exporting an arbitrary field selection. A reconstruction with newly authored surface fields would be a separate candidate requiring its own fidelity evidence.

No crop source/model/bridge/runtime/shader/fixture changed, no thresholds changed, and no inference of FrontSide savings was made. The initial two Blender invocations completed in approximately 2.65 seconds; they were diagnostic runs, not performance measurements. Root CPU search 81314 may have overlapped; no GPU scene was active here. Subsequent heavy runs were paused for the interactive-loading baseline reservation, then resumed only after the owner confirmed its scene was closed. The first edge-corner invocation exposed Blender 4.5.9's integer tessellation indices; the diagnostic was corrected and the successful invocation completed in approximately 2.4 seconds. The failed invocation emitted no new report or assets.
