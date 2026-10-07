"""Inspect zero normals on the representative full-action worker source.

Do not normalize an undefined direction or export a repair without visual QA.
"""
import sys,json
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
library=json.loads((ROOT/'public/content/worker-actions.json').read_text())['youngMale']
_,doc,binary=read_glb(ROOT/'public'/library['url'].lstrip('/'))
rows=[]
for node in doc['nodes']:
    if 'mesh' not in node:continue
    prim=doc['meshes'][node['mesh']]['primitives'][0]
    normal=accessor(doc,binary,prim['attributes']['NORMAL'])
    position=accessor(doc,binary,prim['attributes']['POSITION']).astype(np.float64)
    indices=accessor(doc,binary,prim['indices']).reshape(-1,3)
    bad=np.flatnonzero(np.linalg.norm(normal.astype(np.float64),axis=1)<.5)
    if not len(bad):continue
    cross=np.cross(position[indices[:,1]]-position[indices[:,0]],position[indices[:,2]]-position[indices[:,0]])
    sums=np.zeros_like(position)
    for corner in range(3):np.add.at(sums,indices[:,corner],cross)
    area=np.linalg.norm(cross,axis=1);affected=np.isin(indices,bad).any(axis=1)
    rows.append(dict(mesh=node['name'],zeroNormalVertices=bad.tolist(),affectedFaces=np.flatnonzero(affected).tolist(),
        nondegenerateAffectedFaces=int((affected&(area>1e-10)).sum()),
        incidentAreaNormalStillZeroVertices=int((np.linalg.norm(sums[bad],axis=1)<1e-10).sum()),affectedArea=float(area[affected].sum()/2)))
report=dict(status='NORMAL_DIAGNOSTIC_NOT_APPROVED',sourceUrl=library['url'],sourceSha256=library['sha256'],meshes=rows,
    limitations=['Normal reconstruction changes authored accessory shading and must pass local maps/visual gates.',
        'Zero direction cannot be normalized; never replace with an arbitrary global axis.',
        'Some zero-normal vertices have zero incident area; inspect degeneracy and positional seams separately.'])
(ROOT/'docs/qa/frontside-model-pilot/worker-zero-normal-diagnostics.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(dict(meshes=len(rows),zeroNormalVertices=sum(len(r['zeroNormalVertices']) for r in rows))))
