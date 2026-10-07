"""Read-only inventory of conservative removable interior vertex fans.

No decimation/export. A prospective fan must preserve a simple manifold ring,
one organ driver, constant authored normals, affine UVs and a region where the
actual crop growth/bridge base transforms are affine. Counts do not approve it.
"""
import hashlib,json,sys
from collections import Counter,defaultdict
sys.dont_write_bytecode=True
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text());reports=[]
for name in ['maiz_03_adulto','maiz_04_desarrollo','maiz_05_maduro','platano_05_maduro']:
    node=next(n for n in doc['nodes'] if n.get('name')==name);prim=doc['meshes'][node['mesh']]['primitives'][0]
    position=accessor(doc,binary,prim['attributes']['POSITION']);normal=accessor(doc,binary,prim['attributes']['NORMAL']);uv=accessor(doc,binary,prim['attributes']['TEXCOORD_0'])
    indices=accessor(doc,binary,prim['indices']).reshape(-1,3)
    model=node['extras']['cropIndex']*5+node['extras']['stage']-1;labels=bridges['models'][model]['faceLabels']
    incident=defaultdict(list)
    for f,tri in enumerate(indices):
        for vertex in tri:incident[int(vertex)].append(f)
    reasons=Counter();fans=[]
    for vertex,faces in incident.items():
        if len(faces)<3:reasons['notInteriorFan']+=1;continue
        if len({labels[f] for f in faces})!=1:reasons['driverBoundary']+=1;continue
        ring=Counter()
        for f in faces:
            neighbors=[int(v) for v in indices[f] if v!=vertex]
            if len(neighbors)!=2:break
            ring[tuple(sorted(neighbors))]+=1
        else:
            degree=Counter(v for edge in ring for v in edge)
            neighbors=sorted(degree)
            if len(neighbors)!=len(faces) or any(n!=2 for n in degree.values()) or any(n!=1 for n in ring.values()):reasons['openOrNonManifoldFan']+=1;continue
            unseen=set(neighbors);pending=[unseen.pop()]
            while pending:
                v=pending.pop();others={w for edge in ring if v in edge for w in edge}&unseen;unseen.difference_update(others);pending.extend(others)
            if unseen:reasons['disconnectedRing']+=1;continue
            verts=[vertex,*neighbors];p=position[verts].astype(np.float64);n=normal[verts]
            if not np.all(n.view(np.uint32)==n[0].view(np.uint32)):reasons['normalNotConstant']+=1;continue
            below=bool(np.all(p[:,1]<=.1))
            horizontal=bool(np.all(p[:,1]==p[0,1]));radial=np.linalg.norm(p[:,[0,2]],axis=1)
            # If above ground, the entire polygon must lie outside the radial
            # transition or wholly inside its inner disk. Bounding vertices alone
            # cannot prove an outside polygon avoids the disk: use conservative
            # axis-aligned halfspace separation for the outer case.
            outer=any(bool(np.all(p[:,axis]>=.22) or np.all(p[:,axis]<=-.22)) for axis in [0,2])
            inner=bool(np.all(radial<=.035))
            if not (below or (horizontal and (inner or outer))):reasons['nonlinearGrowthOrWindRegion']+=1;continue
            design=np.column_stack([p,np.ones(len(p))]);planeResidual=float(np.linalg.svd(p-p[0],compute_uv=False)[-1])
            if planeResidual>1e-12:reasons['notExactPlaneDiagnostic']+=1;continue
            fit=np.linalg.lstsq(design,uv[verts].astype(np.float64),rcond=None)[0];uvResidual=float(np.max(np.abs(design@fit-uv[verts])))
            if uvResidual>1e-10:reasons['uvNotAffineDiagnostic']+=1;continue
            fans.append(dict(vertex=vertex,faces=faces,ring=neighbors,label=labels[faces[0]],belowGround=below,uvFitResidual=uvResidual,planeResidual=planeResidual,nominalTriangleReduction=2))
    # Vertex-fan candidates may overlap; report a deterministic disjoint subset.
    taken=set();disjoint=[]
    for fan in fans:
        if not taken.intersection(fan['faces']):disjoint.append(fan);taken.update(fan['faces'])
    reports.append(dict(mesh=name,triangles=len(indices),vertices=len(position),rejectedReasons=dict(reasons),eligibleFans=fans,disjointFans=disjoint,disjointNominalReduction=2*len(disjoint)))
out=dict(status='AFFINE_FAN_DIAGNOSIS_NOT_APPROVAL',sourceSha256=hashlib.sha256(raw).hexdigest(),meshes=reports,
    thresholds={'planeFitResidual':1e-12,'uvFitResidual':1e-10},limitations=['Numerical affine fits only screen proposals; no source index/attribute/faceLabel changes.',
    'Retriangulation can change Float32 raster interpolation; full shader/UV/morph/wind/shadow QA remains mandatory.',
    'A positive fan would need controlled triangulation and rebuilt bridge mappings, not a global Blender decimation.',
    'This deliberately conservative audit is not a proof that broader remodeling cannot work.'])
(folder/'crop-affine-fan-audit.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps([dict(mesh=r['mesh'],eligible=len(r['eligibleFans']),disjointNominalReduction=r['disjointNominalReduction']) for r in reports]))
