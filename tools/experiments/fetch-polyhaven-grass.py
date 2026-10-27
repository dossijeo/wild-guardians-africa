"""Fetch the verified CC0 Grass Medium 01 1K glTF source to a temp cache.

Source: https://polyhaven.com/a/grass_medium_01 (Rico Cilliers / Rob Tuytel, CC0).
The complete collection is only an input for a compact experimental tuft; it
is never shipped with the game. The Poly Haven API provides MD5 and sizes.
"""
import hashlib
import json
import tempfile
from pathlib import Path
import requests

root=Path(tempfile.gettempdir())/'wg-grass-medium-01'
catalog=requests.get('https://api.polyhaven.com/files/grass_medium_01',timeout=30).json()
manifest=catalog['gltf']['1k']['gltf']
sources={'grass_medium_01_1k.gltf':manifest,**manifest['include'],
         'textures/grass_medium_01_dry_diff_1k.jpg':catalog['dry_diff']['1k']['jpg'],
         'textures/grass_medium_01_alpha_1k.png':catalog['Alpha']['1k']['png']}
expected={
 'grass_medium_01_1k.gltf':'28dd8247f3faa749bf87a0b84be01e7e',
 'textures/grass_medium_01_nor_gl_1k.jpg':'fcf43dd1253f56e4c361079f34155c37',
 'textures/grass_medium_01_diff_1k.jpg':'6b18ed50d776fd20c1304d9994bd764e',
 'textures/grass_medium_01_arm_1k.jpg':'37ed2730a507b681af2e9f9f7ef3ae5e',
 'grass_medium_01.bin':'e0527a0561c2dae5b7b5c1b478d8c6bf',
 'textures/grass_medium_01_dry_diff_1k.jpg':'df1e82fec31268ecee8c17757115ba32',
 'textures/grass_medium_01_alpha_1k.png':'6b5b251ef1ca9a69ab9f49def66d758a',
}
for name,item in sources.items():
    if item['md5']!=expected[name]:raise RuntimeError(f'Poly Haven source changed: {name}')
    path=root/name
    path.parent.mkdir(parents=True,exist_ok=True)
    if not path.exists() or hashlib.md5(path.read_bytes()).hexdigest()!=item['md5']:
        response=requests.get(item['url'],timeout=90);response.raise_for_status()
        path.write_bytes(response.content)
    if len(path.read_bytes())!=item['size'] or hashlib.md5(path.read_bytes()).hexdigest()!=item['md5']:
        raise RuntimeError(f'Poly Haven source checksum mismatch: {name}')
    print(name,path.stat().st_size)
print(root)
