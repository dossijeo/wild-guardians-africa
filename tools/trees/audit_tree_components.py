"""Inventory connected surfaces for visual cleanup; never remove by size alone."""
import json
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree

inventory=json.loads(Path('docs/lighting/tree-near-retexture/donor-inventory.json').read_text())
result=[]
for row in inventory['assets']:
    biome,slot=row['biome'],row['slot']
    pack=json.loads(Path(f'public/content/biome-{biome}.json').read_text(encoding='utf8'))
    asset=next(a for a in pack['assets'] if a['slot']==slot)
    raw=Path('public'+pack['binary']['url']).read_bytes()
    for level,lod in enumerate(asset['lods']):
        def read(role,width):
            d=lod[role];return np.frombuffer(raw,dtype=d['type'],count=d['count'],offset=d['offset']).reshape(-1,width)
        positions=read('position',3);faces=read('index',3)
        welded,inverse=np.unique(np.round(positions,6),axis=0,return_inverse=True)
        ids=inverse[faces];a=ids.flatten();b=np.roll(ids,1,axis=1).flatten()
        graph=coo_matrix((np.ones(len(a)),(a,b)),shape=(len(welded),len(welded)))
        count,labels=connected_components(graph,directed=False)
        face_labels=labels[ids[:,0]]
        groups=[]
        for component in range(count):
            triangle_ids=np.flatnonzero(face_labels==component)
            if not len(triangle_ids):continue
            vertices=positions[np.unique(faces[triangle_ids])]
            groups.append({'id':component,'triangles':len(triangle_ids),'bounds':[vertices.min(axis=0).tolist(),vertices.max(axis=0).tolist()],
                           'triangleIndices':triangle_ids.tolist()})
        groups.sort(key=lambda g:-g['triangles'])
        main=positions[np.unique(faces[groups[0]['triangleIndices']])];tree=cKDTree(main)
        for g in groups:
            vertices=positions[np.unique(faces[g['triangleIndices']])]
            g['nearestMainVertexDistance']=float(tree.query(vertices)[0].min())
        result.append({'biome':biome,'slot':slot,'level':level,'components':groups})
    print(biome,slot,'LOD0 components',len(result[-len(asset['lods'])]['components']))
Path('docs/lighting/tree-near-retexture/components.json').write_text(json.dumps({'scope':'Connected surface inventory, not a removal policy. Separate foliage, rocks and grass can be intentional.','assets':result},indent=2)+'\n')
