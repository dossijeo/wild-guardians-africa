"""Verify all 30 editing sources against the currently installed runtime data."""
import hashlib, io, json, struct
from pathlib import Path
from PIL import Image

root = Path('docs/lighting/biome-retexture-sources')
rows, pixel_cache = [], {}
digest = lambda data: hashlib.sha256(data).hexdigest()
for biome in ['savanna', 'desert', 'grand_river', 'mangrove', 'canyons', 'volcanoes']:
    pack = json.loads(Path(f'public/content/biome-{biome}.json').read_text(encoding='utf8'))
    binary = Path('public' + pack['binary']['url']).read_bytes()
    for asset in pack['assets'][:5]:
        path = root / biome / (asset['slot'] + '.glb')
        raw = path.read_bytes()
        assert struct.unpack_from('<III', raw) == (0x46546c67, 2, len(raw))
        size = struct.unpack_from('<I', raw, 12)[0]
        gltf = json.loads(raw[20:20+size]); blob = raw[28+size:]
        def view(index):
            item = gltf['bufferViews'][index]
            return blob[item.get('byteOffset', 0):item.get('byteOffset', 0)+item['byteLength']]
        primitive = gltf['meshes'][0]['primitives'][0]
        geometry = {}
        for role, semantic in [('position','POSITION'),('normal','NORMAL'),('uv','TEXCOORD_0'),('index',None)]:
            source = asset['lods'][0][role]
            width = {'<f4':4, '<u2':2, '<u4':4}[source['type']]
            expected = binary[source['offset']:source['offset']+source['count']*width]
            accessor = gltf['accessors'][primitive['attributes'][semantic] if semantic else primitive['indices']]
            actual = view(accessor['bufferView'])
            assert actual == expected, (biome, asset['slot'], role)
            geometry[role] = digest(actual)
        textures = pack['textureSets'][asset['textureSet']] if 'textureSet' in asset else pack['textures']
        maps = []
        for source, embedded in zip(textures, gltf['images'], strict=True):
            url = source['base64']['url']
            if url not in pixel_cache:
                with Image.open('public'+url) as image:
                    pixel_cache[url] = (image.size, digest(image.convert('RGBA').tobytes()))
            with Image.open(io.BytesIO(view(embedded['bufferView']))) as image:
                actual = (image.size, digest(image.convert('RGBA').tobytes()))
            assert actual == pixel_cache[url], (biome, asset['slot'], source['role'])
            maps.append({'role':source['role'], 'dimensions':actual[0], 'rgbaSHA256':actual[1], 'runtimeURL':url})
        rows.append({'biome':biome,'slot':asset['slot'],'name':asset['name'],'file':path.relative_to(root).as_posix(),'bytes':len(raw),'sha256':digest(raw),'geometry':geometry,'maps':maps})
assert len(rows) == 30
(root/'inventory.json').write_text(json.dumps({'scope':'Current runtime geometry bytes and decoded texture pixels; preview material is not the runtime shader. No generated textures or runtime replacement.', 'assets':rows},indent=2,ensure_ascii=False)+'\n',encoding='utf8')
print(f'Verified {len(rows)} assets across 6 biomes; geometry and all embedded maps identical to runtime.')
