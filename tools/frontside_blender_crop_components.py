"""Blender scratch inspection of exact crop components; never export repair.

Only exact geometric positions share scratch vertices. Source corner/UV/label
indices remain intact in the original file. Scratch normal recalculation is a
diagnostic proposal, never visual or topology acceptance.
"""
import hashlib,json,sys
from collections import Counter,defaultdict
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy,bmesh
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

folder=ROOT/'docs/qa/frontside-model-pilot'
receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'))
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text())
visibility=json.loads((folder/'runtime-visibility-selection.json').read_text())['selected']
training=json.loads((folder/'crop-color-guided-training.json').read_text())
assert training['sourceSha256']==hashlib.sha256(raw).hexdigest()
reports=[]
for name in ['maiz_03_adulto','maiz_04_desarrollo','maiz_05_maduro','platano_05_maduro']:
    node=next(n for n in doc['nodes'] if n.get('name')==name)
    prim=doc['meshes'][node['mesh']]['primitives'][0]
    position=accessor(doc,binary,prim['attributes']['POSITION'])
    normal=accessor(doc,binary,prim['attributes']['NORMAL'])
    triangles=accessor(doc,binary,prim['indices']).reshape(-1,3)
    points,ids=np.unique(position,axis=0,return_inverse=True)
    scratch_faces=ids[triangles]
    mesh=bpy.data.meshes.new(name+'-inspection');mesh.from_pydata(points.tolist(),[],scratch_faces.tolist());mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bm.faces.ensure_lookup_table()
    assert len(bm.faces)==len(triangles)
    before=[tuple(f.normal) for f in bm.faces]
    source_indices=[f.index for f in bm.faces]
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.faces.ensure_lookup_table();assert source_indices==[f.index for f in bm.faces]
    assert all(tuple(v.co)==tuple(float(c) for c in points[v.index]) for v in bm.verts)
    changed=[f.index for f,b in zip(bm.faces,before) if sum(a*c for a,c in zip(f.normal,b))<-.5]
    edges=defaultdict(list)
    for face,verts in enumerate(scratch_faces):
        for a,b in zip(verts,np.roll(verts,-1)):
            if a!=b:edges[tuple(sorted((int(a),int(b))))].append((face,int(a>b)))
    adjacent=[set() for _ in triangles]
    for connected in edges.values():
        faces={f for f,_ in connected}
        for face in faces:adjacent[face].update(faces)
    model=node['extras']['cropIndex']*5+node['extras']['stage']-1
    selected=set(visibility.get(name,[]))|set(training['selected'].get(name,[]))
    selected.update(int(entry.split(':')[1]) for entry in visibility.get('bridgeSource',[]) if int(entry.split(':')[0])==model)
    labels=bridges['models'][model]['faceLabels']
    unseen=set(range(len(triangles)));components=[]
    while unseen:
        seed=unseen.pop();group={seed};pending=[seed]
        while pending:
            face=pending.pop();others=adjacent[face]&unseen;unseen.difference_update(others);group.update(others);pending.extend(others)
        face_ids=sorted(group);xyz=position[triangles[face_ids]].astype(np.float64)
        flat=xyz.reshape(-1,3);center=flat.mean(0);cross=np.cross(xyz[:,1]-xyz[:,0],xyz[:,2]-xyz[:,0]);area=np.linalg.norm(cross,axis=1)
        dot=np.sum(cross*normal[triangles[face_ids]].sum(1),axis=1)
        group_edges=[v for v in edges.values() if v[0][0] in group]
        boundary=sum(len(v)==1 for v in group_edges);nonmanifold=sum(len(v)>2 for v in group_edges)
        same_winding=sum(len(v)==2 and v[0][1]==v[1][1] for v in group_edges)
        eigen=np.linalg.eigvalsh((flat-center).T@(flat-center)/len(flat))
        shifted=xyz-center;signed_volume=float(np.sum(np.einsum('ij,ij->i',shifted[:,0],np.cross(shifted[:,1],shifted[:,2])))/6)
        components.append(dict(faces=face_ids,triangles=len(face_ids),selectedReverses=len(group&selected),selectedReversesAmongProposedFlips=len(group&selected&set(changed)),
            labels=dict(Counter(str(labels[f]) for f in face_ids)),boundaryEdges=boundary,nonManifoldEdges=nonmanifold,
            sameWindingEdges=same_winding,zeroAreaFaces=int(np.sum(area==0)),opposedAuthoredNormals=int(np.sum((area>0)&(dot<0))),
            proposedBlenderFlips=sorted(group&set(changed)),signedVolumeDiagnostic=signed_volume,
            spatialEigenvalues=eigen.tolist(),bounds=[flat.min(0).tolist(),flat.max(0).tolist()],
            closedConsistentDiagnostic=boundary==nonmanifold==same_winding==0 and not np.any(area==0)))
    reports.append(dict(mesh=name,sourceTriangles=len(triangles),sourceVertices=len(position),scratchExactPositions=len(points),
        proposedBlenderFlips=changed,components=components))
    bm.free();bpy.data.meshes.remove(mesh)
out=dict(status='BLENDER_COMPONENT_DIAGNOSIS_NOT_APPROVAL',source=receipt['source'],sourceSha256=hashlib.sha256(raw).hexdigest(),
    blenderVersion=bpy.app.version_string,meshes=reports,limitations=['Scratch exact position sharing is not UV/normal/label welding permission.',
    'No source data modified and no Blender asset export; recalculation flips are diagnostic proposals only.',
    'Closedness and signed volume are not FrontSide approval; interfaces and runtime morph/wind need visual checks.',
    'Open/flat components can deliberately need geometric reverse faces; no solidify or blanket duplication.'])
(folder/'crop-blender-components.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps([dict(mesh=r['mesh'],components=len(r['components']),flips=len(r['proposedBlenderFlips']),
    closedTriangles=sum(c['triangles'] for c in r['components'] if c['closedConsistentDiagnostic']),
    selectedReverses=sum(c['selectedReverses'] for c in r['components'])) for r in reports]))
