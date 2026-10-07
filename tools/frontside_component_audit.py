"""Trace missing-pixel source faces through exact positional components."""
import argparse,json,sys
sys.dont_write_bytecode=True
from collections import defaultdict,Counter
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
parser=argparse.ArgumentParser();parser.add_argument('--color',action='store_true');parser.add_argument('--mesh',choices=['Prop_WateringCan_geometry_1','Prop_WateringCan_geometry_2','Can_Nozzle_geometry_3'],default='Prop_WateringCan_geometry_1');args=parser.parse_args()
provenance_path='youngMale-can-wall-water-v3-rgb-provenance.json' if args.color else 'worker-water-missing-triangle-provenance.json'
provenance=json.loads((ROOT/'docs/qa/frontside-model-pilot'/provenance_path).read_text())
library=json.loads((ROOT/'public/content/worker-actions.json').read_text())['youngMale']
assert provenance['sourceSha256']==library['sha256']
_,doc,binary=read_glb(ROOT/'public'/library['url'].lstrip('/'))
name=args.mesh;node=next(n for n in doc['nodes'] if n.get('name')==name)
prim=doc['meshes'][node['mesh']]['primitives'][0]
position=accessor(doc,binary,prim['attributes']['POSITION']);normal=accessor(doc,binary,prim['attributes']['NORMAL']);indices=accessor(doc,binary,prim['indices']).reshape(-1,3)
_,ids=np.unique(position,axis=0,return_inverse=True);edges=defaultdict(list)
for face,vertices in enumerate(ids[indices]):
    for a,b in zip(vertices,np.roll(vertices,-1)):edges[tuple(sorted((int(a),int(b))))].append(face)
adjacent=[set() for _ in indices]
for faces in edges.values():
    for face in faces:adjacent[face].update(faces)
source_records=next(r['faces'] for r in provenance['rgbTriangleProvenance'] if r['side']=='source') if args.color else provenance['missingTriangleProvenance']
missing={r['face'] for r in source_records if r['mesh']==name}
unseen=set(range(len(indices)));components=[]
while unseen:
    seed=unseen.pop();group={seed};pending=[seed]
    while pending:
        face=pending.pop();others=adjacent[face]&unseen;unseen.difference_update(others);group.update(others);pending.extend(others)
    tri=indices[sorted(group)];xyz=position[tri];points=xyz.reshape(-1,3)
    cross=np.cross(xyz[:,1]-xyz[:,0],xyz[:,2]-xyz[:,0]);area2=np.linalg.norm(cross,axis=1)
    normals=normal[tri].sum(axis=1);dot=np.sum(cross*normals,axis=1)
    counts=Counter(tuple(sorted((int(a),int(b)))) for verts in ids[tri] for a,b in zip(verts,np.roll(verts,-1)) if a!=b)
    components.append(dict(faces=sorted(group),min=points.min(0).tolist(),max=points.max(0).tolist(),containsMissing=bool(group&missing),
        degenerateFaces=int(np.sum(area2<=2e-12)),opposedAuthoredNormals=int(np.sum((area2>2e-12)&(dot<0))),
        exactBoundaryEdges=sum(v==1 for v in counts.values()),exactNonManifoldEdges=sum(v>2 for v in counts.values())))
report=dict(status='COMPONENT_DIAGNOSIS_NOT_APPROVED',mesh=name,sourceUrl=library['url'],sourceSha256=library['sha256'],components=components)
filename=name+'-rgb-components.json' if args.color else 'watering-can-components.json'
(ROOT/'docs/qa/frontside-model-pilot'/filename).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps([dict(faces=len(c['faces']),containsMissing=c['containsMissing']) for c in components]))
