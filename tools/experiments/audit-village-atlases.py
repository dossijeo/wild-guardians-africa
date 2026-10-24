"""Report effective atlas resolution of existing packed village geometry.

The village binary stores interleaved position/normal/UV float32 vertices and
uint32 indices. A village unit is rendered at scale 16 in WorldScene.
"""
from pathlib import Path
import json

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
for village in json.loads((ROOT / "public/content/villages.json").read_text()):
    if village["id"] not in {"mapungubwe", "musgum", "suajili"}:
        continue
    path = ROOT / "public" / village["binary"]["url"].lstrip("/")
    vertices = np.fromfile(path, dtype="<f4", count=village["vertexBytes"] // 4).reshape(-1, 8)
    indices = np.fromfile(path, dtype="<u4", offset=village["vertexBytes"])
    color = ROOT / "public" / village["textures"]["color"].lstrip("/")
    width, height = Image.open(color).size
    print(village["id"], "atlas", width, height, "download", color.stat().st_size)
    for unit in village["units"][:3]:
        triangles = indices[unit["offset"]:unit["offset"] + unit["count"]].reshape(-1, 3)
        pos = vertices[triangles, :3] * 16
        uv = vertices[triangles, 6:8]
        world_area = np.linalg.norm(np.cross(pos[:, 1] - pos[:, 0], pos[:, 2] - pos[:, 0]), axis=1) * .5
        edge_a = (uv[:, 1] - uv[:, 0]) * (width, height)
        edge_b = (uv[:, 2] - uv[:, 0]) * (width, height)
        texel_area = np.abs(edge_a[:, 0] * edge_b[:, 1] - edge_a[:, 1] * edge_b[:, 0]) * .5
        valid = (world_area > 1e-7) & (texel_area > 1e-7)
        density = np.sqrt(texel_area[valid] / world_area[valid])
        weights = world_area[valid]
        order = np.argsort(density)
        density, weights = density[order], weights[order]
        cumulative = np.cumsum(weights) / np.sum(weights)
        quantiles = np.interp([.1, .5, .9], cumulative, density)
        print(" ", unit["name"], "texels/metre q10/q50/q90", np.round(quantiles, 1), "invalid-area %", round(100 * (1 - weights.sum() / world_area.sum()), 2))
