"""Blender headless pilot: add subtle sub-atlas surface grain at original 2048².

The deterministic, color-preserving grain is confined to warm material colors;
bright painted decoration, dark openings, UVs and geometry remain untouched.
Run: blender -b --python tools/experiments/build-village-color-detail.py
Requires Pillow in the host Python for final WebP encoding.
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
    original = ROOT / "public" / village["textures"]["color"].lstrip("/")
    atlas = bpy.data.images.load(str(original), check_existing=False)
    atlas.colorspace_settings.name = "Non-Color"  # Work in encoded atlas values.
    width, height = atlas.size
    pixels = np.asarray(atlas.pixels[:], dtype=np.float32).reshape(height, width, 4).copy()
    rgb = pixels[..., :3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    value = rgb.max(axis=2)
    warm = np.clip((r - g * 1.03) * 6.0, 0.0, 1.0) * np.clip((g - b * 1.01) * 7.0, 0.0, 1.0)
    warm *= np.clip((value - .14) * 6.0, 0.0, 1.0) * np.clip((.92 - value) * 7.0, 0.0, 1.0)
    seed = 327 + 23 * len(village["id"])
    rng = np.random.default_rng(seed)
    fine = rng.standard_normal((height, width), dtype=np.float32)
    coarse = rng.standard_normal((height // 4, width // 4), dtype=np.float32)
    coarse = np.repeat(np.repeat(coarse, 4, axis=0), 4, axis=1)
    # About 2% luminance variation: visible at a close camera, mip-filtered away
    # at normal gameplay distance. Hue and the authored silhouette are preserved.
    grain = np.clip(fine * .012 + coarse * .009, -.045, .045) * warm
    rgb[:] = np.clip(rgb * (1.0 + grain[..., None]), 0.0, 1.0)
    image = bpy.data.images.new(f"{village['id']}-color-detail", width=width, height=height, alpha=True)
    image.colorspace_settings.name = "Non-Color"
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw = str(OUT / f"{village['id']}-color-detail.png")
    image.file_format = "PNG"
    image.save()
    subprocess.run([
        "python", "-c",
        "from PIL import Image; from pathlib import Path; import sys; p=Path(sys.argv[1]); Image.open(p).convert('RGB').save(p.with_suffix('.webp'),quality=96,method=6)",
        image.filepath_raw,
    ], check=True)
    Path(image.filepath_raw).unlink()
    print(f"Saved {Path(image.filepath_raw).with_suffix('.webp')} ({width}x{height})")
    bpy.data.images.remove(image)
    bpy.data.images.remove(atlas)
