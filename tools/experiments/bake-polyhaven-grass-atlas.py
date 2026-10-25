"""Combine CC0 Grass Medium 01 dry diffuse and alpha in one RGBA atlas."""
from pathlib import Path
import tempfile
import numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[2]
src=Path(tempfile.gettempdir())/'wg-grass-medium-01/textures'
color=np.asarray(Image.open(src/'grass_medium_01_dry_diff_1k.jpg').convert('RGB'),dtype=np.uint8)
alpha=np.asarray(Image.open(src/'grass_medium_01_alpha_1k.png').convert('L'),dtype=np.uint8)
rgba=np.dstack((color,alpha))
out=root/'public/assets/visual-lab/savanna-polyhaven-dry-atlas.png'
Image.fromarray(rgba,'RGBA').save(out,optimize=True)
print(out,out.stat().st_size)
