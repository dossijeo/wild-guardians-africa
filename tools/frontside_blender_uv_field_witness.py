"""Read-only UV interior counterexamples for source shading reconstruction.

Tests original triangle centroids, not cameras. Positive witnesses prove a
UV-only lookup ambiguity; negative samples do not prove global injectivity.
"""
import sys,json,hashlib
from pathlib import Path
from collections import defaultdict
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
out=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((out/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,d,b=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
models=json.loads((ROOT/'public/content/crop-bridges.json').read_text())['models'];rows=[]
for node in d['nodes']:
    meta=node.get('extras',{})
    if meta.get('cropIndex')!=0 or 'stage' not in meta:continue
    prim=d['meshes'][node['mesh']]['primitives'][0]
    p,n,u=[accessor(d,b,prim['attributes'][k]).astype(float) for k in ['POSITION','NORMAL','TEXCOORD_0']]
    ix=accessor(d,b,prim['indices']).reshape(-1,3)
    labels=np.asarray(models[meta['stage']-1]['faceLabels']);leaves=[]
    for label in sorted(set(map(int,labels[labels>=2]))):
        faces=np.flatnonzero(labels==label);T=u[ix[faces]];P=p[ix[faces]];N=n[ix[faces]]
        A=T[:,1]-T[:,0];B=T[:,2]-T[:,0];det=A[:,0]*B[:,1]-A[:,1]*B[:,0]
        valid=np.abs(det)>1e-18;centroids=T.mean(axis=1);hits=[];ambiguous=set();zero=int((~valid).sum())
        max_position=0.;max_normal=0.;overlap_pairs=set()
        for j,q in enumerate(centroids):
            D=q-T[:,0]
            a=np.divide(D[:,0]*B[:,1]-D[:,1]*B[:,0],det,out=np.zeros(len(T)),where=valid)
            c=np.divide(A[:,0]*D[:,1]-A[:,1]*D[:,0],det,out=np.zeros(len(T)),where=valid)
            others=np.flatnonzero(valid&(a>1e-8)&(c>1e-8)&(a+c<1-1e-8))
            sourceP=P[j].mean(axis=0);sourceN=N[j].mean(axis=0)
            for k in others:
                k=int(k)
                if k==j:continue
                weights=np.asarray([1-a[k]-c[k],a[k],c[k]])
                targetP=weights@P[k];targetN=weights@N[k]
                pd=float(np.linalg.norm(targetP-sourceP));nd=float(np.linalg.norm(targetN-sourceN))
                # A numerical diagnostic tolerance, not an acceptance threshold.
                if pd<=1e-10 and nd<=1e-10:continue
                overlap_pairs.add(tuple(sorted((int(faces[j]),int(faces[k])))));ambiguous.add(int(faces[j]))
                max_position=max(max_position,pd);max_normal=max(max_normal,nd)
                if len(hits)<12:hits.append(dict(sourceFace=int(faces[j]),otherFace=int(faces[k]),uv=q.tolist(),otherBarycentrics=weights.tolist(),positionDelta=pd,rawNormalDelta=nd))
        leaves.append(dict(label=label,sourceFaces=len(faces),uvDegenerateFaces=zero,centroidsWithAmbiguousFields=len(ambiguous),witnessPairs=len(overlap_pairs),maxWitnessPositionDelta=max_position,maxWitnessRawNormalDelta=max_normal,witnesses=hits))
    rows.append(dict(mesh=node['name'],stage=meta['stage'],leaves=leaves))
report=dict(status='SOURCE_UV_INTERIOR_COUNTEREXAMPLES_NOT_ASSET',sourceSha256=receipt['sourceSha256'],blender=bpy.app.version_string,models=rows,
    limitations=['Only triangle centroid witnesses; an empty result does not prove global UV injectivity or absence of other overlap.',
    'Raw interpolated source fields only, not posed-normal directions, GPU derivative behavior or pixel quality.',
    'Overlapping fields require explicit charts/correspondence; no source welding or mutation is performed.',
    'No candidate, texture field, timing, resource budget or FrontSide acceptance.'])
(out/'crop-maize-uv-interior-witness.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
print(json.dumps(dict(status=report['status'],models=[dict(mesh=m['mesh'],ambiguousCentroids=sum(l['centroidsWithAmbiguousFields'] for l in m['leaves']),witnessPairs=sum(l['witnessPairs'] for l in m['leaves'])) for m in rows])))
