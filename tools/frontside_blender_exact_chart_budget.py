"""Read-only camera-independent exact chart budget; no simplification/export."""
import hashlib,json,sys,math
from pathlib import Path
from collections import defaultdict
from fractions import Fraction as F
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
labels=json.loads((ROOT/'public/content/crop-bridges.json').read_text())['models']
rows=[]
for node in doc['nodes']:
    meta=node.get('extras',{})
    if meta.get('cropIndex')!=0 or 'stage' not in meta:continue
    prim=doc['meshes'][node['mesh']]['primitives'][0]
    p,n,uv=[accessor(doc,binary,prim['attributes'][name]) for name in ['POSITION','NORMAL','TEXCOORD_0']]
    ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
    face_labels=labels[meta['stage']-1]['faceLabels'];assert len(face_labels)==len(ix)
    mesh=bpy.data.meshes.new('READ_ONLY_'+node['name']);mesh.from_pydata(p.tolist(),[],ix.tolist());mesh.update()
    assert len(mesh.polygons)==len(ix)
    ids={};keys=[]
    for point in p:
        key=tuple(map(float,point));ids.setdefault(key,len(ids));keys.append(ids[key])
    tri_ids=np.asarray(keys)[ix];coincident=defaultdict(list);charts=defaultdict(list);eligible=0
    for face,vertices in enumerate(tri_ids):
        coincident[tuple(sorted(map(int,vertices)))].append(face)
        q=p[ix[face]].astype(float);nn=n[ix[face]].astype(float);t=uv[ix[face]].astype(float)
        if not(np.isfinite(q).all() and np.isfinite(nn).all() and np.isfinite(t).all()):continue
        normal_bits=n[ix[face]].view(np.uint32)
        if not(np.array_equal(normal_bits[0],normal_bits[1]) and np.array_equal(normal_bits[0],normal_bits[2])) or not np.linalg.norm(nn[0]):continue
        # Conservative proof domains: source warp is affine here for every
        # sy/sr/open/clock/seed. Radius margin avoids GLSL edge-rounding ambiguity.
        domain='belowGroundIdentity' if (q[:,1]<=float(np.float32(.1))).all() else 'constantHeightInnerRadius' if (q[:,1]==q[0,1]).all() and (np.linalg.norm(q[:,[0,2]],axis=1)<=.034).all() else None
        if domain is None or np.signbit(t[t==0]).any():continue
        Q=[[F(float(x)) for x in point] for point in q];T=[[F(float(x)) for x in point] for point in t]
        a=[Q[1][k]-Q[0][k] for k in range(3)];b=[Q[2][k]-Q[0][k] for k in range(3)]
        cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
        if not any(cross) or sum(cross[k]*F(float(nn[0,k])) for k in range(3))<=0:continue
        axis=max(range(3),key=lambda k:abs(cross[k]));lanes=[k for k in range(3) if k!=axis];u,v=lanes
        det=a[u]*b[v]-a[v]*b[u];field=[]
        for lane in range(2):
            da=T[1][lane]-T[0][lane];db=T[2][lane]-T[0][lane]
            A=(da*b[v]-db*a[v])/det;B=(a[u]*db-b[u]*da)/det
            field.extend([A,B,T[0][lane]-A*Q[0][u]-B*Q[0][v]])
        plane=tuple([x/cross[axis] for x in cross]+[-sum(cross[k]*Q[0][k] for k in range(3))/cross[axis]])
        key=(domain,face_labels[face],tuple(map(int,normal_bits[0])),plane,tuple(field))
        charts[key].append(face);eligible+=1
    components=[];possible_saving=0
    for chart,faces in charts.items():
        edges=defaultdict(list)
        for face in faces:
            verts=tri_ids[face]
            for a,b in zip(verts,np.roll(verts,-1)):edges[tuple(sorted((int(a),int(b))))].append((face,int(a),int(b)))
        adjacency=defaultdict(set)
        for owners in edges.values():
            if len(owners)==2 and owners[0][1:]==owners[1][1:][::-1]:
                a,b=owners[0][0],owners[1][0];adjacency[a].add(b);adjacency[b].add(a)
        unseen=set(faces)
        while unseen:
            seed=unseen.pop();component={seed};pending=[seed]
            while pending:
                others=adjacency[pending.pop()]&unseen;unseen-=others;component|=others;pending.extend(others)
            owners=[[(f,a,b) for f,a,b in o if f in component] for o in edges.values()];owners=[o for o in owners if o]
            bad=any(len(o)>2 or len(o)==2 and o[0][1:]!=o[1][1:][::-1] for o in owners)
            boundary=[(a,b) for o in owners if len(o)==1 for _,a,b in o];degree=defaultdict(int);adj=defaultdict(set)
            for a,b in boundary:degree[a]+=1;degree[b]+=1;adj[a].add(b);adj[b].add(a)
            reached=set();stack=[boundary[0][0]] if boundary else []
            while stack:
                x=stack.pop()
                if x not in reached:reached.add(x);stack.extend(adj[x]-reached)
            single_cycle=bool(boundary) and not bad and all(d==2 for d in degree.values()) and len(reached)==len(degree)
            minimum=len(boundary)-2 if single_cycle else len(component)
            saving=max(0,len(component)-minimum);possible_saving+=saving
            if saving:components.append(dict(faces=sorted(component),domain=chart[0],faceLabel=chart[1],boundaryEdges=len(boundary),optimisticMinimumTriangles=minimum,optimisticSaving=saving))
    duplicate_groups=[v for v in coincident.values() if len(v)>1]
    stem=sum(x==1 for x in face_labels);needed=max(0,stem-math.floor(len(ix)*.1))
    rows.append(dict(mesh=node['name'],sourceTriangles=len(ix),sourceStemTriangles=stem,eligibleExactAffineFaces=eligible,
        exactCoincidentTriangleGroups=len(duplicate_groups),exactCoincidentFaces=sum(map(len,duplicate_groups)),
        optimisticChartSaving=possible_saving,savingNeededForAllStemReversesUnderTenPercent=needed,
        optimisticBudgetFeasible=possible_saving>=needed,chartsWithPotentialSavings=components))
    bpy.data.meshes.remove(mesh)
report=dict(status='EXACT_CHART_BUDGET_DIAGNOSTIC_NOT_CANDIDATE',blender=bpy.app.version_string,sourceSha256=receipt['sourceSha256'],states=rows,
    limitations=['No source edits, triangulation, export, camera/heldout input or new candidate generated.',
    'Exact rational P-plane and UV affine coefficients; constant finite nonzero normals, same semantic label, no signed-zero field merging.',
    'Only below-ground identity or constant-height inner-radius domains certify source growth warp affine; this is a deliberately conservative domain, not proof other reconstruction is impossible.',
    'Savings are optimistic simple-boundary triangulation counts, not a verified tessellation or visual/map/shadow equivalence. Concavity/collinear constraints, GPU interpolation precision, material programs and reverse normal-map recipe still require validation.',
    'Coincident position triangles do not establish equivalent UV/normal fields, removal safety, duplicate causality or permission to canonicalize.',
    'Ten-percent budget remains unchanged; physical GPU storage/draw overhead/net benefit are not measured.'])
(folder/'crop-maize-exact-chart-budget.json').write_bytes((json.dumps(report,indent=2)+'\n').encode('utf8'))
print(json.dumps([{k:r[k] for k in ['mesh','eligibleExactAffineFaces','exactCoincidentFaces','optimisticChartSaving','savingNeededForAllStemReversesUnderTenPercent','optimisticBudgetFeasible']} for r in rows]))
