"""Trace missing-pixel source faces through exact positional components."""
import json,sys
sys.dont_write_bytecode=True
from collections import defaultdict
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
provenance=json.loads((ROOT/'docs/qa/frontside-model-pilot/worker-water-missing-triangle-provenance.json').read_text())
library=json.loads((ROOT/'public/content/worker-actions.json').read_text())['youngMale']
assert provenance['sourceSha256']==library['sha256']
_,doc,binary=read_glb(ROOT/'public'/library['url'].lstrip('/'))
name='Prop_WateringCan_geometry_1';node=next(n for n in doc['nodes'] if n.get('name')==name)
prim=doc['meshes'][node['mesh']]['primitives'][0]
position=accessor(doc,binary,prim['attributes']['POSITION']);indices=accessor(doc,binary,prim['indices']).reshape(-1,3)
_,ids=np.unique(position,axis=0,return_inverse=True);edges=defaultdict(list)
for face,vertices in enumerate(ids[indices]):
    for a,b in zip(vertices,np.roll(vertices,-1)):edges[tuple(sorted((int(a),int(b))))].append(face)
adjacent=[set() for _ in indices]
for faces in edges.values():
    for face in faces:adjacent[face].update(faces)
missing={r['face'] for r in provenance['missingTriangleProvenance'] if r['mesh']==name}
unseen=set(range(len(indices)));components=[]
while unseen:
    seed=unseen.pop();group={seed};pending=[seed]
    while pending:
        face=pending.pop();others=adjacent[face]&unseen;unseen.difference_update(others);group.update(others);pending.extend(others)
    points=position[indices[sorted(group)]].reshape(-1,3)
    components.append(dict(faces=sorted(group),min=points.min(0).tolist(),max=points.max(0).tolist(),containsMissing=bool(group&missing)))
report=dict(status='COMPONENT_DIAGNOSIS_NOT_APPROVED',mesh=name,sourceUrl=library['url'],sourceSha256=library['sha256'],components=components)
(ROOT/'docs/qa/frontside-model-pilot/watering-can-components.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps([dict(faces=len(c['faces']),containsMissing=c['containsMissing']) for c in components]))
