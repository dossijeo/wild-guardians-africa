"""Audit immutable worker GLBs; build a disabled youngMale rigid-subset pilot.

python tools/audit_worker_frontside.py [--candidate]
Requires numpy. Exact-coordinate adjacency is a conservative selection filter,
not a universal FrontSide criterion or a visual/GPU acceptance test.
"""
import argparse, copy, hashlib, json, pathlib, struct, sys
sys.dont_write_bytecode = True
from collections import Counter
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/qa/workers-frontside'
SELECTED = {'Prop_FruitCrate_geometry_7', 'Prop_FruitCrate_geometry_8',
            'Prop_FruitCrate_geometry_9', 'Prop_Hoe_geometry_23', 'Prop_Hoe_geometry_24'}
CLIPS = {'Idle', 'Walk_Skip', 'Run', 'Wave', 'Dig', 'Plant', 'Water', 'Harvest',
         'Carry_Crate', 'Alert', 'Hit', 'Fall'}

def sha(data): return hashlib.sha256(data).hexdigest()

def read_glb(path):
    raw = path.read_bytes()
    assert struct.unpack_from('<III', raw) == (0x46546c67, 2, len(raw))
    chunks = []
    offset = 12
    while offset < len(raw):
        size, kind = struct.unpack_from('<II', raw, offset)
        chunks.append((kind, raw[offset + 8:offset + 8 + size]))
        offset += 8 + size
    assert offset == len(raw) and [k for k, _ in chunks] == [0x4e4f534a, 0x004e4942]
    return raw, json.loads(chunks[0][1]), chunks[1][1]

def accessor(doc, binary, index):
    a = doc['accessors'][index]
    assert 'sparse' not in a
    v = doc['bufferViews'][a['bufferView']]
    assert not v.get('extensions', {}).get('EXT_meshopt_compression')
    dtype = np.dtype({5121: '<u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}[a['componentType']])
    lanes = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    return np.ndarray((a['count'], lanes), dtype=dtype, buffer=binary,
        offset=v.get('byteOffset', 0) + a.get('byteOffset', 0),
        strides=(v.get('byteStride', dtype.itemsize * lanes), dtype.itemsize)).copy()

def geometry(doc, binary, node, primitive):
    p = accessor(doc, binary, primitive['attributes']['POSITION'])
    n = accessor(doc, binary, primitive['attributes']['NORMAL'])
    ix = accessor(doc, binary, primitive['indices']).reshape(-1, 3)
    _, ids = np.unique(p, axis=0, return_inverse=True)
    tri = ids[ix]
    edges = np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]])
    _, inverse, counts = np.unique(np.sort(edges, axis=1), axis=0, return_inverse=True, return_counts=True)
    directions = np.bincount(inverse, weights=np.where(edges[:, 0] < edges[:, 1], 1, -1))
    q = p[ix].astype(np.float64)
    cross = np.cross(q[:, 1] - q[:, 0], q[:, 2] - q[:, 0])
    normals = n[ix].astype(np.float64)
    lengths = np.linalg.norm(normals, axis=2)
    return dict(name=node.get('name'), triangles=len(ix), vertices=len(p), skin=node.get('skin'),
        morphTargets=len(primitive.get('targets', [])),
        boundaryEdges=int(np.sum(counts == 1)), nonManifoldEdges=int(np.sum(counts > 2)),
        windingConflicts=int(np.sum((counts == 2) & (directions != 0))),
        degenerateTriangles=int(np.sum(np.linalg.norm(cross, axis=1) == 0)),
        signedVolume=float(np.einsum('ij,ij->i', q[:, 0], np.cross(q[:, 1], q[:, 2])).sum() / 6),
        undefinedNormals=int(np.sum(np.linalg.norm(n, axis=1) < 1e-10)),
        finiteNormals=bool(np.isfinite(n).all()), nonunitCorners=int(np.sum(abs(lengths - 1) > 1e-4)),
        opposedCorners=int(np.sum(np.einsum('ij,ikj->ik', cross, normals) < 0)))

def main():
    args = argparse.ArgumentParser()
    args.add_argument('--candidate', action='store_true')
    options = args.parse_args()
    manifest = json.loads((ROOT / 'public/content/worker-actions.json').read_text(encoding='utf8'))
    report = dict(status='CPU_AUDIT_NOT_VISUAL_OR_GPU_APPROVAL', profiles=[], candidate=None)
    for profile, record in manifest.items():
        raw, doc, binary = read_glb(ROOT / 'public' / record['url'].lstrip('/'))
        assert sha(raw) == record['sha256'] and len(raw) == record['bytes']
        assert {a['name'] for a in doc['animations']} == CLIPS
        rows = []
        for node in doc['nodes']:
            if 'mesh' not in node: continue
            for primitive in doc['meshes'][node['mesh']]['primitives']:
                row = geometry(doc, binary, node, primitive)
                row['doubleSided'] = doc['materials'][primitive['material']].get('doubleSided', False)
                rows.append(row)
        report['profiles'].append(dict(profile=profile, source=record['url'], sha256=sha(raw),
            bytes=len(raw), binarySha256=sha(binary), nodes=len(doc['nodes']), meshes=len(doc['meshes']),
            joints=[len(s['joints']) for s in doc['skins']], geometry=rows,
            animations=[dict(name=a['name'], channels=len(a['channels']), samplers=len(a['samplers'])) for a in doc['animations']]))
        if not options.candidate or profile != 'youngMale': continue
        selected = [r for r in rows if r['name'] in SELECTED]
        assert len(selected) == 5 and sum(r['triangles'] for r in selected) == 8640
        for row in selected:
            assert row['skin'] is None and row['morphTargets'] == 0 and row['doubleSided']
            assert all(row[k] == 0 for k in ['boundaryEdges', 'nonManifoldEdges', 'windingConflicts', 'degenerateTriangles', 'undefinedNormals', 'nonunitCorners', 'opposedCorners'])
            assert row['finiteNormals'] and row['signedVolume'] > 0
        candidate = copy.deepcopy(doc)
        remap = {}
        for node in candidate['nodes']:
            if node.get('name') not in SELECTED: continue
            for primitive in candidate['meshes'][node['mesh']]['primitives']:
                source_material = primitive['material']
                if source_material not in remap:
                    material = copy.deepcopy(doc['materials'][source_material])
                    material['doubleSided'] = False
                    remap[source_material] = len(candidate['materials'])
                    candidate['materials'].append(material)
                primitive['material'] = remap[source_material]
        text = json.dumps(candidate, separators=(',', ':'), ensure_ascii=True).encode()
        text += b' ' * (-len(text) % 4)
        data = struct.pack('<III', 0x46546c67, 2, 28 + len(text) + len(binary)) + struct.pack('<II', len(text), 0x4e4f534a) + text + struct.pack('<II', len(binary), 0x004e4942) + binary
        destination = ROOT / '.cache/workers-frontside' / (sha(data) + '.glb')
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        _, verified, verified_binary = read_glb(destination)
        assert verified_binary == binary
        for key in ['nodes', 'skins', 'animations', 'accessors', 'bufferViews', 'images', 'textures', 'samplers']:
            assert verified.get(key) == doc.get(key)
        assert verified['materials'][:len(doc['materials'])] == doc['materials']
        for mi, mesh in enumerate(doc['meshes']):
            for pi, primitive in enumerate(mesh['primitives']):
                restored = copy.deepcopy(verified['meshes'][mi]['primitives'][pi])
                restored['material'] = primitive['material']
                assert restored == primitive
        report['candidate'] = dict(status='DISABLED_PARTIAL_PILOT', sourceSha256=sha(raw), sha256=sha(data),
            path=destination.relative_to(ROOT).as_posix(), bytes=len(data), sourceBytes=len(raw),
            binaryExact=True, rigClipsAttributesImagesExact=True, selected=selected,
            unselectedAccessories='Original DoubleSide', body='Original FrontSide; no added gain',
            shaderRequirement='Preserve original DOUBLE_SIDED normal/TBN recipe independently of raster culling',
            visualAcceptance='Pending native human/AI scoped review; diagnostic pixels are not automatic rejection',
            gpuAcceptance='Pending whole-worker original-effective-sidedness vs candidate net AB/BA, including shadows')
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'cpu-audit.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    print(json.dumps(dict(profiles=len(report['profiles']), clips=sum(len(p['animations']) for p in report['profiles']), candidate=report['candidate'] and report['candidate']['sha256'])))

if __name__ == '__main__': main()
