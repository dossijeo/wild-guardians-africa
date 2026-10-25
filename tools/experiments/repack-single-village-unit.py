"""Reconstruct one Mapungubwe unit from the authoritative runtime binary.

Exploratory audit for a same-resolution atlas repack. No source asset is edited.
Run with Blender 4.5+: blender -b --python tools/experiments/repack-single-village-unit.py
"""
from pathlib import Path
import json
import subprocess

import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "docs/qa/global-visual-lab/single-building-atlas"
OUTPUT.mkdir(parents=True, exist_ok=True)
ASSETS = ROOT / "public/assets/visual-lab"
ASSETS.mkdir(parents=True, exist_ok=True)
village = next(v for v in json.loads((ROOT / "public/content/villages.json").read_text()) if v["id"] == "mapungubwe")
unit = village["units"][0]
source = ROOT / "public" / village["binary"]["url"].lstrip("/")
vertices = np.fromfile(source, dtype="<f4", count=village["vertexBytes"] // 4).reshape(-1, 8)
indices = np.fromfile(source, dtype="<u4", offset=village["vertexBytes"])[unit["offset"]:unit["offset"] + unit["count"]]
used, local_indices = np.unique(indices, return_inverse=True)
local = vertices[used]

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
mesh = bpy.data.meshes.new("mapu-0-original-triangles")
mesh.from_pydata(local[:, :3].tolist(), [], local_indices.reshape(-1, 3).tolist())
mesh.update()
for polygon in mesh.polygons:
    polygon.use_smooth = True
mesh.normals_split_custom_set_from_vertices(local[:, 3:6].tolist())
obj = bpy.data.objects.new(unit["name"], mesh)
bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
original = mesh.uv_layers.new(name="original")
for loop in mesh.loops:
    original.data[loop.index].uv = local[loop.vertex_index, 6:8]
packed = mesh.uv_layers.new(name="repacked")
for loop in mesh.loops:
    packed.data[loop.index].uv = original.data[loop.index].uv
mesh.uv_layers.active = packed
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.select_all(action="SELECT")
bpy.ops.uv.pack_islands(rotate=True, scale=True, margin=.003)
bpy.ops.object.mode_set(mode="OBJECT")
original = mesh.uv_layers["original"]
packed = mesh.uv_layers["repacked"]

per_vertex = {}
for loop in mesh.loops:
    per_vertex.setdefault(loop.vertex_index, []).append(tuple(packed.data[loop.index].uv))
inconsistent = sum(1 for values in per_vertex.values() if max(abs(u[axis] - values[0][axis]) for u in values for axis in (0, 1)) > 1e-5)
packed_uv = np.asarray([per_vertex[index][0] for index in range(len(local))], dtype="<f4")
def texel_density(uv):
    triangles = local_indices.reshape(-1, 3)
    world = local[triangles, :3] * 16
    mapped = uv[triangles] * 2048
    world_area = np.linalg.norm(np.cross(world[:, 1] - world[:, 0], world[:, 2] - world[:, 0]), axis=1) * .5
    a, b = mapped[:, 1] - mapped[:, 0], mapped[:, 2] - mapped[:, 0]
    texel_area = np.abs(a[:, 0] * b[:, 1] - a[:, 1] * b[:, 0]) * .5
    valid = (world_area > 1e-7) & (texel_area > 1e-7)
    density = np.sqrt(texel_area[valid] / world_area[valid]); weight = world_area[valid]
    order = np.argsort(density)
    return float(np.interp(.5, np.cumsum(weight[order]) / weight.sum(), density[order]))
report = {
    "culture": village["id"], "unit": unit["key"], "name": unit["name"],
    "originalVertexCount": int(len(used)), "originalTriangleCount": int(len(indices) // 3),
    "reconstructedVertexCount": len(mesh.vertices), "reconstructedTriangleCount": len(mesh.polygons),
    "positionMaxError": float(np.max(np.abs(np.asarray([v.co[:] for v in mesh.vertices]) - local[:, :3]))),
    "originalUvMaxError": float(max(abs(original.data[loop.index].uv[axis] - local[loop.vertex_index, 6 + axis]) for loop in mesh.loops for axis in (0, 1))),
    "repackedVerticesWithDivergentUv": inconsistent,
    "sourceMedianTexelsPerMetre": texel_density(local[:, 6:8]),
    "repackedMedianTexelsPerMetre": texel_density(packed_uv),
    "repackedUvBounds": [float(min(uv[axis] for values in per_vertex.values() for uv in values)) for axis in (0, 1)] + [float(max(uv[axis] for values in per_vertex.values() for uv in values)) for axis in (0, 1)],
}
(OUTPUT / "reconstruction-audit.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
if inconsistent:
    raise RuntimeError("Repacking would require an index/vertex split; keep the source topology intact")

rebuilt = local.copy()
rebuilt[:, 6:8] = packed_uv
with (ASSETS / "mapu-0-repacked.bin").open("wb") as handle:
    handle.write(rebuilt.astype("<f4").tobytes())
    handle.write(local_indices.astype("<u4").tobytes())

transfer = OUTPUT / "atlas-transfer.npz"
np.savez_compressed(transfer, source_uv=local[:, 6:8], target_uv=packed_uv, triangles=local_indices.reshape(-1, 3))
subprocess.run(["python", str(ROOT / "tools/experiments/rasterize-single-village-atlas.py"), str(ROOT / "public" / village["textures"]["color"].lstrip("/")), str(transfer), str(ASSETS / "mapu-0-color-repacked.webp")], check=True)
print("Saved", ASSETS / "mapu-0-repacked.bin", ASSETS / "mapu-0-color-repacked.webp")
