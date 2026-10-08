# Boundary sampling investigation

The read-only Blender 4.5.9 run ended with exit code 0 (exec session 69501). No live Blender PID was observed in the subsequent process snapshot; the session's terminal result, rather than an absent PID, establishes completion. It produced no mesh candidate or GLB.

For mature maize, none of the boundary samples could be removed under the previously declared position, UV, normal and curve-gradient limits across 315 independent growth/fold/wind samples. The source has 4935 triangles: 824 stem, 3009 leaves and 1102 soil. If both stem and leaves needed explicit reverse geometry, the 10% triangle gate would permit only 1339 forward leaf triangles. This operation does not finance that construction.

This is a restricted operation, not proof that reconstruction is impossible. It preserves UV seams and semantic interfaces, does not reconstruct interiors, and samples the deformation envelope without certifying its continuous bounds. Its curve gradients do not certify surface tangent frames. Original geometry and all previous visual rejections remain intact.

Reproduce from the worktree with its verified portable Blender:

```powershell
& .cache/frontside-model-pilot/tools/blender-4.5.9-windows-x64/blender.exe --background --python tools/frontside_blender_boundary_resampling.py
```

The next investigation separates geometric connectivity from source shading charts. Before attempting a derived surface, audit ambiguities in position/UV/normal correspondences and whether a field indexed by UV alone would lose different normals or geometric locations. An auxiliary shading representation would introduce storage and sampling costs; it would require the same DoubleSide quality checks, growth validation and net GPU benchmark as any other candidate. It cannot replace silhouette or shadow geometry.
