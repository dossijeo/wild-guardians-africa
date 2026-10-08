# Planar stem alternative: rejected resource proposal, not a visual result

This offline pilot uses the original mature maize stem, label1 only. The original
GLB SHA256 is be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef.
No screenshots, heldout views, visibility masks or repaired face IDs are inputs.
Original soil and leaf corner POSITION/NORMAL/UV bits and face labels remain exact.

`frontside_blender_stem_planar.py` geometrically welds only numerically identical
Float32 positions for inspection. Original UVs and custom normals remain separate
per-loop values. Blender4.5.9LTS 8bf95cbd38d1 DECIMATE/DISSOLVE with NORMAL and UV
delimiters tries angle limits .000001/.0001/.001 radians. It exports separate
disabled JSON corner archives, not GLBs or runtime bridge data.

All three trials leave **824 stem triangles**. Full geometric stem reverses would
make **5759 whole-state triangles (+16.697%)**, exceeding the existing +10% pilot
triangle gate. Shared P/N/UV plus index estimate is **333978 bytes (+5.334%)**,
inside that single-state decoded-byte gate. The distinct byte result is retained;
it does not override the failed triangle gate. Category/bridge allocations, web
compression, draw calls, vertex invocations and GPU memory/timings are unmeasured.
Maximum sampled nearest-original distance is 1.6453e-7 model units; this is neither
a bidirectional geometric bound nor an image, normal-map or deformation guarantee.
No visual screen or benchmark is requested for these resource-ineligible trials.

`frontside_crop_stem_interfaces.py` separately audits exact source interfaces:
305 boundary edges, 40 edges with more than two incident faces and 1013 two-face
edges. Of the paired edges, 620 have discontinuous original UVs and 621 have
discontinuous original normals. Only one paired edge is geometrically near planar
at .001 radians, and none is both near planar and continuous in UV and normals.
The conservative closed/consistent/positive-volume/unit-aligned-normal filter
finds zero eligible stem triangles. These are diagnostics, not universal FrontSide
requirements or proof that another derivative cannot work. Source indices, seams
and materials have not been edited to force closure.

The ratio .75 Double-only quality screen remains separate and frozen at8a2950f4.
This alternative does not approve it or reinterpret any previous bridge-hole,
RGB or resource rejection. The original all-state procedural deformation and
growth correspondence still need preserved contracts for any accepted derivative.

Reproduce offline from this worktree:

```powershell
& '.cache/frontside-model-pilot/tools/blender-4.5.9-windows-x64/blender.exe' --background --factory-startup --python tools/frontside_blender_stem_planar.py
python tools/frontside_crop_stem_interfaces.py
```

Receipts: maize-blender-stem-planar-diagnostic.json and
maize-stem-exact-interface-diagnostic.json. The original source hash is checked
before either pipeline reads its arrays. Immutable generated corner archives are
identified by SHA256 in the Blender receipt and remain outside production paths.
