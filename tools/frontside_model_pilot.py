"""Read-only audit of the actual crop and complete worker action GLBs.

Run from repository root: python tools/frontside_model_pilot.py
Raw source accessor order is retained; welding is for diagnostics only.
No candidate is approved by topology alone.
"""
import hashlib, json, pathlib, struct
from collections import Counter
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/qa/frontside-model-pilot'
DTYPES = {5120: '<i1', 5121: '<u1', 5122: '<i2', 5123: '<u2', 5125: '<u4', 5126: '<f4'}
LANES = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

def read_glb(path):
    data = path.read_bytes()
    assert data[:4] == b'glTF' and struct.unpack_from('<I', data, 8)[0] == len(data)
    offset, doc, binary = 12, None, None
    while offset < len(data):
        size, kind = struct.unpack_from('<II', data, offset)
        payload = data[offset+8:offset+8+size]
        if kind == 0x4e4f534a: doc = json.loads(payload)
        if kind == 0x004e4942: binary = payload
        offset += 8 + size
    return data, doc, binary

def accessor(doc, binary, index):
    a = doc['accessors'][index]
    assert 'sparse' not in a, 'Sparse accessor requires explicit decoding'
    v = doc['bufferViews'][a['bufferView']]
    assert 'EXT_meshopt_compression' not in v.get('extensions', {}), 'Audit lossless source, not encoded lanes'
    dtype = np.dtype(DTYPES[a['componentType']]); lanes = LANES[a['type']]
    offset = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.ndarray((a['count'], lanes), dtype=dtype, buffer=binary, offset=offset,
                      strides=(v.get('byteStride', dtype.itemsize*lanes), dtype.itemsize)).copy()

def topology(p, n, index):
    # Quantized seam welding is diagnostic only. Original indices/UV/weights stay untouched.
    _, ids = np.unique(np.round(p/1e-5).astype(np.int64), axis=0, return_inverse=True)
    tri = ids[index]; points = p[index].astype(np.float64)
    crosses = np.cross(points[:, 1]-points[:, 0], points[:, 2]-points[:, 0])
    areas = np.linalg.norm(crosses, axis=1)
    degenerate = areas <= 1e-10
    valid = tri[~degenerate]
    edges = np.concatenate([valid[:, [0, 1]], valid[:, [1, 2]], valid[:, [2, 0]]])
    sorted_edges = np.sort(edges, axis=1)
    _, inv, counts = np.unique(sorted_edges, axis=0, return_inverse=True, return_counts=True)
    directions = np.bincount(inv, weights=np.where(edges[:, 0] < edges[:, 1], 1, -1))
    dot = np.sum(crosses*n[index].mean(axis=1), axis=1)
    face_keys = np.sort(valid, axis=1)
    _, duplicate_counts = np.unique(face_keys, axis=0, return_counts=True)
    return dict(triangles=len(index), vertices=len(p), weldedVertices=int(ids.max()+1),
        boundaryEdges=int(np.sum(counts == 1)), nonManifoldEdges=int(np.sum(counts > 2)),
        inconsistentEdges=int(np.sum((counts == 2)&(directions != 0))),
        degenerateTriangles=int(degenerate.sum()), normalOpposedTriangles=int(np.sum((dot < 0)&~degenerate)),
        coincidentExtraFaces=int(np.sum(duplicate_counts-1)),
        minimum=list(map(float,p.min(axis=0))), maximum=list(map(float,p.max(axis=0))))

def main():
    models = json.loads((ROOT/'public/content/models.json').read_text(encoding='utf8'))
    crop = next(m for m in models if 'Cultivos' in m['source'])
    workers = json.loads((ROOT/'public/content/worker-actions.json').read_text(encoding='utf8'))
    bridges = json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
    web = json.loads((ROOT/'content/manifests/web-assets.json').read_text(encoding='utf8'))
    rows, files = [], []
    for kind, url in [('crops',crop['url']), *[(k,v['url']) for k,v in workers.items()]]:
        path = ROOT/'public'/url.lstrip('/')
        data, doc, binary = read_glb(path)
        record = next(r for r in web['records'] if '/'+r['source'] == url)
        files.append(dict(category=kind, source=url, sha256=hashlib.sha256(data).hexdigest(),
            bytes=len(data), runtime=record['runtime'], runtimeSha256=record['runtimeSha256'],
            clips=[dict(name=a.get('name'), channels=len(a['channels'])) for a in doc.get('animations',[])],
            skins=len(doc.get('skins',[])), nodes=len(doc['nodes']), morphTargetCount=sum(len(p.get('targets',[])) for m in doc['meshes'] for p in m['primitives'])))
        for node in doc['nodes']:
            if 'mesh' not in node: continue
            for primitive, mesh in enumerate(doc['meshes'][node['mesh']]['primitives']):
                assert mesh.get('mode',4) == 4
                p = accessor(doc,binary,mesh['attributes']['POSITION'])
                n = accessor(doc,binary,mesh['attributes']['NORMAL'])
                ix = accessor(doc,binary,mesh['indices']).reshape(-1,3)
                info = topology(p,n,ix)
                extras = node.get('extras',{})
                if kind == 'crops':
                    i = extras['cropIndex']*5 + extras['stage']-1
                    bridge = bridges['models'][i]
                    assert bridge['vertices']==len(p) and bridge['faces']==len(ix)
                    assert len(bridge['faceLabels'])==len(ix)
                    info['regions'] = len(bridge['regions'])
                material = doc['materials'][mesh['material']]
                rows.append(dict(category=kind,name=node.get('name'),primitive=primitive,extras=extras,
                    attributes=list(mesh['attributes']), skin=node.get('skin'),
                    material=material.get('name'), doubleSided=material.get('doubleSided',False), **info))
    OUT.mkdir(parents=True,exist_ok=True)
    report = dict(status='AUDIT_ONLY_NOT_APPROVED', tolerance=1e-5, files=files, meshes=rows,
        limitations=['Rest-pose diagnostics do not prove animated visibility.',
            'Open boundaries are not automatically defects; deliberate leaves must remain visible from both sides.',
            'Coincident faces and quantized seams need local inspection before repair.',
            'No shader visual comparison or GPU benchmark performed.'])
    (OUT/'source-audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    print(json.dumps(dict(meshes=len(rows), files=len(files), output=str(OUT/'source-audit.json'))))

if __name__ == '__main__': main()
