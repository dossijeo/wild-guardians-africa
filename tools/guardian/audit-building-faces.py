"""Read-only audit of installed building faces; never rewrites production GLBs."""
import collections
import hashlib
import json
import pathlib
import struct
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]


def audit(descriptor):
    raw = (ROOT / 'public' / descriptor['url'].lstrip('/')).read_bytes()
    size = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + size])
    binary = raw[28 + size:]

    def accessor(index):
        a = doc['accessors'][index]
        view = doc['bufferViews'][a['bufferView']]
        if a.get('sparse') or view.get('extensions'):
            raise ValueError('Compressed/sparse accessor needs explicit decoding')
        fmt = {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[a['componentType']]
        count = {'SCALAR': 1, 'VEC3': 3}[a['type']]
        width = struct.calcsize('<' + fmt * count)
        offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
        return [struct.unpack_from('<' + fmt * count, binary, offset + i * view.get('byteStride', width)) for i in range(a['count'])]

    primitives = []
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            if primitive.get('mode', 4) != 4:
                raise ValueError('Expected triangles')
            positions = accessor(primitive['attributes']['POSITION'])
            indices = [x[0] for x in accessor(primitive['indices'])]
            keys = collections.defaultdict(list)
            degenerates = []
            for triangle in range(len(indices) // 3):
                vertices = [positions[indices[triangle * 3 + k]] for k in range(3)]
                key = tuple(sorted(tuple(round(c, 6) for c in v) for v in vertices))
                keys[key].append(triangle)
                a, b, c = vertices
                u = [b[i] - a[i] for i in range(3)]
                v = [c[i] - a[i] for i in range(3)]
                cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
                if sum(x*x for x in cross) < 1e-20:
                    degenerates.append(triangle)
            duplicates = [ids for ids in keys.values() if len(ids) > 1]
            primitives.append({'triangles': len(indices)//3, 'duplicateGroups': duplicates, 'degenerateFaces': degenerates})
    return {'culture': descriptor['culture'], 'url': descriptor['url'], 'sha256': hashlib.sha256(raw).hexdigest(), 'primitives': primitives}


result = {'scope': 'Coincident triangle vertices rounded to 1e-6 in each primitive; independent of winding. Does not detect partial coplanar overlaps or texture/shadow aliasing.', 'buildings': [audit(d) for d in json.loads((ROOT/'public/content/destruction.json').read_text())['buildings']]}
if len(sys.argv) > 1:
    pathlib.Path(sys.argv[1]).write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
for building in result['buildings']:
    print(building['culture'], [(p['triangles'], len(p['duplicateGroups']), len(p['degenerateFaces'])) for p in building['primitives']])
