"""Read-only all-species native stem filter; not closure/quality approval."""
import hashlib,json,sys
from pathlib import Path
from collections import defaultdict
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot'
r=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,d,b=read_glb(ROOT/'public'/r['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==r['sourceSha256']
bridge=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'));rows=[]
for node in d['nodes']:
    meta=node.get('extras',{})
    if 'cropIndex' not in meta or 'stage' not in meta:continue
    prim=d['meshes'][node['mesh']]['primitives'][0]
    p,n=[accessor(d,b,prim['attributes'][k]) for k in ['POSITION','NORMAL']];ix=accessor(d,b,prim['indices']).reshape(-1,3)
    labels=np.asarray(bridge['models'][meta['cropIndex']*5+meta['stage']-1]['faceLabels']);assert len(labels)==len(ix)
    faces=np.flatnonzero(labels==1);stem=set(map(int,faces));edges=defaultdict(list)
    for face,tri in enumerate(ix):
        for a,z in zip(tri,np.roll(tri,-1)):
            ka,kz=tuple(map(float,p[a])),tuple(map(float,p[z]));edges[tuple(sorted((ka,kz)))].append((face,1 if ka<kz else -1))
    touched=[owners for owners in edges.values() if any(f in stem for f,_ in owners)]
    boundary=sum(len(o)==1 for o in touched);junction=sum(len(o)>2 for o in touched);conflicts=sum(len(o)==2 and o[0][1]==o[1][1] for o in touched)
    q=p[ix[faces]].astype(np.float64);nn=n[ix[faces]].astype(np.float64)
    cross=np.cross(q[:,1]-q[:,0],q[:,2]-q[:,0]);dots=np.sum(nn*cross[:,None,:],axis=2)
    degenerate=int(np.sum(np.linalg.norm(cross,axis=1)==0));undefined=int(np.sum(~np.isfinite(nn).all(axis=2)|(np.linalg.norm(nn,axis=2)==0)));opposed=int(np.sum(dots<0));orthogonal=int(np.sum(dots==0))
    rows.append(dict(mesh=node['name'],cropIndex=meta['cropIndex'],stage=meta['stage'],sourceTriangles=len(ix),stemTriangles=len(faces),
        wholeBoundaryEdges=boundary,wholeJunctionEdges=junction,wholeWindingConflictEdges=conflicts,degenerateStemFaces=degenerate,
        undefinedNormalCorners=undefined,opposedNormalCorners=opposed,orthogonalNormalCorners=orthogonal,
        localGeometricFilterEligible=bool(len(faces) and not(boundary or junction or conflicts or degenerate or undefined or opposed or orthogonal))))
report=dict(status='LOCAL_NATIVE_STEM_FILTER_NOT_FRONT_APPROVAL',blender=bpy.app.version_string,sourceSha256=r['sourceSha256'],states=rows,
    limitations=['Exact numeric POSITION incidence on whole original model; no epsilon weld, cap, export, source edits or camera selection.',
        'Eligibility only checks all stem-adjacent whole edges and local face/normal agreement, not whole-component closedness, solid volume, vertex links or visibility.',
        'Attachments to other labels are retained. Absence of local whole boundary is not proof that original backs are invisible through another region.',
        'Native growth/UV/material/shadows, bridges, Double controls, independent quality and net GPU gates remain required.'])
(folder/'crop-native-stem-local-filter.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps([r for r in rows if r['localGeometricFilterEligible']]))
