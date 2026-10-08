"""Read-only source edge correspondence; never weld, cap or export geometry."""
import hashlib,json,sys
from pathlib import Path
from collections import defaultdict
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')=='sorgo_05_maduro')
primitive=doc['meshes'][node['mesh']]['primitives'][0]
p=accessor(doc,binary,primitive['attributes']['POSITION'])
ix=accessor(doc,binary,primitive['indices']).reshape(-1,3)
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
labels=np.asarray(bridges['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels'])
owners=defaultdict(list)
for face,tri in enumerate(ix):
    for a,b in zip(tri,np.roll(tri,-1)):
        ka,kb=tuple(map(float,p[a])),tuple(map(float,p[b]))
        owners[tuple(sorted((ka,kb)))].append(dict(face=int(face),driver=int(labels[face]),vertices=[int(a),int(b)]))
edges=list(owners)
starts=np.asarray([e[0] for e in edges],dtype=np.float64)
ends=np.asarray([e[1] for e in edges],dtype=np.float64)
boundary=[i for i,e in enumerate(edges) if len(owners[e])==1]

def union_length(intervals):
    total=0.;stop=0.
    for a,b in sorted(intervals):
        if b>stop:total+=b-max(a,stop);stop=b
    return total

rows=[]
for index in boundary:
    edge=edges[index];owner=owners[edge][0];a,b=p[owner['vertices']].astype(np.float64)
    delta=b-a;length=float(np.linalg.norm(delta))
    if length==0:
        rows.append(dict(edge=index,owner=owner,degenerate=True));continue
    direction=delta/length
    # Prospectively declared diagnostic bound, not a topology merge tolerance:
    # eight float32 ULPs at the largest absolute endpoint coordinate, floor1e-12m.
    magnitude=np.float32(max(np.abs(a).max(),np.abs(b).max()))
    tolerance=max(1e-12,8*abs(float(np.spacing(magnitude))))
    ta=(starts-a)@direction;tb=(ends-a)@direction
    ra=np.linalg.norm((starts-a)-ta[:,None]*direction,axis=1)
    rb=np.linalg.norm((ends-a)-tb[:,None]*direction,axis=1)
    lo=np.maximum(0,np.minimum(ta,tb));hi=np.minimum(length,np.maximum(ta,tb))
    # Both counterpart endpoints must lie on the infinite source line. No
    # endpoint snapping or partial near-intersection is counted as overlap.
    selected=np.flatnonzero((ra<=tolerance)&(rb<=tolerance)&(hi-lo>tolerance))
    counterparts=[];intervals=[];opposite=[]
    for other in selected:
        if other==index:continue
        unrelated=[o for o in owners[edges[other]] if o['face']!=owner['face']]
        if not unrelated:continue
        ids=[]
        for o in unrelated:
            oa,ob=p[o['vertices']].astype(np.float64)
            facing=float(np.dot(ob-oa,direction))<0
            ids.append(dict(**o,oppositeEdgeDirection=facing))
            if facing:opposite.append((float(lo[other]),float(hi[other])))
        intervals.append((float(lo[other]),float(hi[other])))
        counterparts.append(dict(edge=int(other),sourceOwners=ids,intervalMetres=[float(lo[other]),float(hi[other])],
            endpointLineResidualMetres=[float(ra[other]),float(rb[other])],exactCollinear=bool(ra[other]==0 and rb[other]==0)))
    # Record nearest parallel witness outside the tolerance without accepting it.
    vectors=ends-starts;norms=np.linalg.norm(vectors,axis=1)
    cosines=np.divide(np.abs(vectors@direction),norms,out=np.zeros_like(norms),where=norms>0)
    possible=[int(j) for j in np.flatnonzero((cosines>=1-1e-6)&(hi-lo>tolerance))
        if j!=index and any(o['face']!=owner['face'] for o in owners[edges[j]])]
    nearest=None
    if possible:
        j=min(possible,key=lambda j:max(ra[j],rb[j]))
        nearest=dict(edge=j,sourceOwners=owners[edges[j]],maximumLineResidualMetres=float(max(ra[j],rb[j])),
            residualToToleranceRatio=float(max(ra[j],rb[j])/tolerance),absoluteDirectionCosine=float(cosines[j]),
            intervalMetres=[float(lo[j]),float(hi[j])],accepted=False)
    rows.append(dict(edge=index,owner=owner,positions=[a.tolist(),b.tolist()],lengthMetres=length,
        diagnosticToleranceMetres=tolerance,coverageFraction=union_length(intervals)/length,
        oppositeDirectionCoverageFraction=union_length(opposite)/length,counterparts=counterparts,nearestParallelWitness=nearest))

report=dict(status='READ_ONLY_CORRESPONDENCE_NOT_REPAIR_OR_APPROVAL',blender=bpy.app.version_string,
    sourceSha256=receipt['sourceSha256'],node=node['name'],boundaryEdges=len(boundary),
    policy='Exact numeric-position topology separately; counterpart line tolerance8float32ULP/floor1e-12m, no weld/export. Coverage does not establish physical closure or attribute/shader equivalence.',
    fullOverlapEdges=sum(r.get('coverageFraction',0)>=1-1e-12 for r in rows),
    fullOppositeOverlapEdges=sum(r.get('oppositeDirectionCoverageFraction',0)>=1-1e-12 for r in rows),
    anyOverlapEdges=sum(bool(r.get('counterparts')) for r in rows),
    stemEdges=[r for r in rows if r['owner']['driver']==1],edges=rows)
target=folder/'sorgo-whole-boundary-overlap-diagnostic.json'
target.write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:report[k] for k in ['boundaryEdges','fullOverlapEdges','fullOppositeOverlapEdges','anyOverlapEdges']}))
