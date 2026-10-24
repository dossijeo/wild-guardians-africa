"""Blender headless pilot: steepen the authored tangent-space village atlases.

Run: blender -b --python tools/experiments/build-village-normal-relief.py
The original color atlases, UVs, geometry and normals are never modified.
"""
from pathlib import Path
import json
import subprocess

import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
VILLAGES = json.loads((ROOT / "public/content/villages.json").read_text())
OUT = ROOT / "public/assets/visual-lab"
OUT.mkdir(parents=True, exist_ok=True)

for village in VILLAGES:
    if village["id"] not in {"mapungubwe", "musgum"}:
        continue
    original = ROOT / "public" / village["textures"]["normal"].lstrip("/")
    atlas = bpy.data.images.load(str(original), check_existing=False)
    atlas.colorspace_settings.name = "Non-Color"
    width, height = atlas.size
    pixels = np.asarray(atlas.pixels[:], dtype=np.float32).reshape(height, width, 4).copy()
    xy = (pixels[..., :2] * 2.0 - 1.0) * 1.45
    length = np.linalg.norm(xy, axis=2, keepdims=True)
    xy *= np.minimum(0.98 / np.maximum(length, 1e-7), 1.0)
    pixels[..., :2] = xy * 0.5 + 0.5
    pixels[..., 2] = np.sqrt(np.maximum(1.0 - np.sum(xy * xy, axis=2), 0.0)) * 0.5 + 0.5
    result = bpy.data.images.new(f"{village['id']}-normal-enhanced", width=width, height=height, alpha=True)
    result.colorspace_settings.name = "Non-Color"
    result.pixels.foreach_set(pixels.ravel())
    result.filepath_raw = str(OUT / f"{village['id']}-normal-enhanced.png")
    result.file_format = "PNG"
    result.save()
    subprocess.run([
        "python", "-c",
        "from PIL import Image; from pathlib import Path; import sys; p=Path(sys.argv[1]); Image.open(p).convert('RGB').save(p.with_suffix('.webp'),quality=94,method=6)",
        result.filepath_raw,
    ], check=True)
    Path(result.filepath_raw).unlink()
    print(f"Saved {Path(result.filepath_raw).with_suffix('.webp')} ({width}x{height})")
    bpy.data.images.remove(result)
    bpy.data.images.remove(atlas)
