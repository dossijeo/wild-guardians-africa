"""Measure donor correspondence without replacing production meshes.

Nearest vertices are a diagnostic, not proof of triangle/UV correspondence.
"""
import json
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree

inventory=json.loads(Path('docs/lighting/tree-near-retexture/donor-inventory.json').read_text())
rows=[]
for entry in inventory['assets']:
    biome,slot=entry['biome'],entry['slot']
    pack=json.loads(Path(f'public/content/biome-{biome}.json').read_text(encoding='utf8'))
    asset=next(a for a in pack['assets'] if a['slot']==slot)
    binary=Path('public'+pack['binary']['url']).read_bytes()
    def attribute(role):
        d=asset['lods'][0][role]
        return np.frombuffer(binary,dtype=d['type'],count=d['count'],offset=d['offset'])
    source=attribute('position').reshape(-1,3).astype(float)
    donor=json.loads(Path(f'.cache/tree-retexture/decoded/{biome}/{slot}/mesh.json').read_text())['primitives'][0]
    target=np.asarray(donor['attributes']['POSITION']).reshape(-1,3)
    # Authoring services may translate and uniformly scale the exported mesh.
    def normalize(v):
        lo,hi=v.min(axis=0),v.max(axis=0)
        return (v-(lo+hi)/2)/(hi[1]-lo[1])
    s,t=normalize(source),normalize(target)
    st=cKDTree(t).query(s)[0];ts=cKDTree(s).query(t)[0]
    # Match triangle corners spatially, never by authoring vertex order.
    _,canonical=np.unique(np.round(s,7),axis=0,return_inverse=True)
    target_source=cKDTree(s).query(t)[1]
    target_ids=canonical[target_source]
    sf=attribute('index').reshape(-1,3).astype(int)
    tf=np.asarray(donor['indices']).reshape(-1,3)
    donor_faces={}
    for i,face in enumerate(tf):
        donor_faces.setdefault(tuple(sorted(target_ids[face])),[]).append(i)
    missing=[];uv_errors=[];flipped_uv_errors=[];matched=0;ambiguous=0;degenerate=0
    transferred_uv=np.full((len(sf),3,2),np.nan,dtype='<f4')
    corner_errors=[]
    source_uv=attribute('uv').reshape(-1,2)
    target_uv=np.asarray(donor['attributes']['TEXCOORD_0']).reshape(-1,2)
    for i,face in enumerate(sf):
        ids=canonical[face];candidates=donor_faces.get(tuple(sorted(ids)),[])
        if len(set(ids))<3:degenerate+=1
        if len(candidates)>1:ambiguous+=1
        if not candidates:
            a,b,c=s[face];missing.append({'triangle':i,'normalizedArea':float(np.linalg.norm(np.cross(b-a,c-a))/2)})
            continue
        matched+=1
        errors=[];flipped_errors=[]
        for candidate in candidates:
            target_face=tf[candidate];corner_ids=target_ids[target_face]
            if len(set(corner_ids))!=3:continue
            order=[int(np.flatnonzero(corner_ids==v)[0]) for v in ids]
            if len(candidates)==1:
                transferred_uv[i]=target_uv[target_face[order]]
                corner_errors.append(float(np.max(np.linalg.norm(s[face]-t[target_face[order]],axis=1))))
            errors.append(float(np.max(np.abs(source_uv[face]-target_uv[target_face[order]]))))
            flipped=target_uv[target_face[order]].copy();flipped[:,1]=1-flipped[:,1]
            flipped_errors.append(float(np.max(np.abs(source_uv[face]-flipped))))
        if errors:uv_errors.append(min(errors))
        if flipped_errors:flipped_uv_errors.append(min(flipped_errors))
    row={'biome':biome,'slot':slot,'sourceBounds':[source.min(axis=0).tolist(),source.max(axis=0).tolist()],
         'donorBounds':[target.min(axis=0).tolist(),target.max(axis=0).tolist()],
         'normalizedVertexDistance':{'sourceToDonor':np.quantile(st,[.5,.95,.99,1]).tolist(),'donorToSource':np.quantile(ts,[.5,.95,.99,1]).tolist()},
         'sourceVerticesBeyondOnePercentHeight':int((st>.01).sum()),
         'triangleCorrespondence':{'matched':matched,'missing':missing,'degenerateSourceFaces':degenerate,'multipleDonorCandidates':ambiguous,'maxMatchedUVError':max(uv_errors,default=None),'maxVFlippedUVError':max(flipped_uv_errors,default=None),'maxNormalizedCornerError':max(corner_errors,default=None)}}
    if not missing and not ambiguous and np.isfinite(transferred_uv).all() and max(corner_errors)<.0002:
        out=Path(f'.cache/tree-retexture/transferred/{biome}/{slot}')
        out.mkdir(parents=True,exist_ok=True)
        # One UV for each ORIGINAL triangle corner. No donor positions or
        # indices are copied; consumers must split seams, retaining source
        # normals, old UVs and AO with the corresponding original vertex.
        transferred_uv.tofile(out/'near-uv-corners.f32')
        row['stagedCornerUVs']=str(out/'near-uv-corners.f32')
    rows.append(row)
    print(biome,slot,'matched',matched,'missing',len(missing),'UV error',max(uv_errors,default=None),'V flipped',max(flipped_uv_errors,default=None))
Path('docs/lighting/tree-near-retexture/surface-audit.json').write_text(json.dumps({'scope':'Normalized nearest-vertex diagnostic only; no surface transfer or geometry removal authorized by this metric alone. Quantiles: median, p95, p99, max.','assets':rows},indent=2)+'\n')
