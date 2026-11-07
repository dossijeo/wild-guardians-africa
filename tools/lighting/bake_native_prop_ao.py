"""Blender offline, alpha-aware native prop visibility, no geometry changes.
blender -b --python tools/lighting/bake_native_prop_ao.py -- --biome savanna
Writes review candidates only; runtime installation is a separate step.
"""
import argparse, hashlib, json, math, sys, time
from pathlib import Path
import bpy
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from vertex_visibility import bake_visibility
p = argparse.ArgumentParser()
p.add_argument('--biome', required=True)
p.add_argument('--samples', type=int, default=32)
p.add_argument('--slot')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
if a.samples < 8:
    raise ValueError('At least eight samples required')
manifest_path = ROOT / 'public/content' / ('biome-' + a.biome + '.json')
pack = json.loads(manifest_path.read_text(encoding='utf-8'))
source = (ROOT / 'public' / pack['binary']['url'].lstrip('/')).read_bytes()
output = ROOT / 'test-results/global-ao' / a.biome
output.mkdir(parents=True, exist_ok=True)

def array(desc, components):
    return np.frombuffer(source, dtype=desc['type'], count=desc['count'], offset=desc['offset']).reshape((-1, components))

textures = {}
def alpha_map(asset):
    group = pack['textures'] if 'textureSet' not in asset else pack['textureSets'][asset['textureSet']]
    texture = next(t for t in group if t['role'] == 'baseColor')
    url = texture['base64']['url']
    if url not in textures:
        image = bpy.data.images.load(str(ROOT / 'public' / url.lstrip('/')), check_existing=True)
        pixels = np.empty(len(image.pixels), dtype=np.float32)
        image.pixels.foreach_get(pixels)
        alpha = pixels.reshape((-1, image.channels))[:, -1] if image.channels == 4 else np.ones(image.size[0] * image.size[1])
        textures[url] = None if np.min(alpha) >= .35 else alpha.reshape((image.size[1], image.size[0]))[::-1].copy()
        bpy.data.images.remove(image)
    return textures[url]

blob = bytearray()
records = []
cache = {}
started = time.perf_counter()
for asset in pack['assets']:
    if a.slot and asset['slot'] != a.slot:
        continue
    alpha = alpha_map(asset)
    for level, lod in enumerate(asset['lods']):
        key = json.dumps([lod, asset.get('textureSet')], sort_keys=True)
        if key in cache:
            records.append(dict(cache[key], slot=asset['slot'], level=level))
            continue
        vertices = array(lod['position'], 3)
        normals = array(lod['normal'], 3)
        uv = array(lod['uv'], 2)
        indices = array(lod['index'], 3)
        values, radius, stats = bake_visibility(vertices, normals, indices, uv, alpha, pack.get('material', {}).get('baseColorFactor', [1,1,1,1])[3], a.samples)
        record = {'slot': asset['slot'], 'level': level, 'offset': len(blob), 'count': len(values),
                  'radius': radius, 'alphaTested': alpha is not None, 'minimum': int(values.min()),
                  'mean': float(values.mean()), **stats}
        blob.extend(values.tobytes())
        records.append(record)
        cache[key] = record
        print(json.dumps(record), flush=True)
(output / 'visibility.bin').write_bytes(blob)
report = {'biome': a.biome, 'source': pack['binary']['url'], 'sourceSHA256': hashlib.sha256(source).hexdigest(),
          'manifestSHA256': hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
          'samples': a.samples, 'encoding': 'uint8-normalized', 'byteLength': len(blob),
          'outputSHA256': hashlib.sha256(blob).hexdigest(), 'seconds': time.perf_counter()-started,
          'records': records, 'scope': 'Offline local geometric visibility. Runtime review and pending acceptance: docs/lighting/global-ao/README.md.'}
(output / 'visibility.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('NATIVE_AO_COMPLETE', a.biome, len(blob), flush=True)
