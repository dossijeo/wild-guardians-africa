"""Source-only boundary classification, no caps/repair/export or view masks."""
import hashlib,json,sys
from pathlib import Path
from collections import defaultdict
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy,bmesh
from mathutils import Vector
from mathutils.geometry import tessellate_polygon
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor
folder=ROOT/'docs/qa/frontside-model-pilot'
s=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/s['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==s['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')=='sorgo_05_maduro');prim=doc['meshes'][node['mesh']]['primitives'][0]
p,n,uv=[accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']];ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'));labels=np.asarray(bridges['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels']);faces=np.flatnonzero(labels==1)
table={};points=[];triangles=[]
for face in faces:
    tri=[]
    for v in ix[face]:
        key=tuple(map(float,p[v]))
        if key not in table:table[key]=len(points);points.append(p[v].tolist())
        tri.append(table[key])
    triangles.append(tri)
mesh=bpy.data.meshes.new('readonly-original-stem');mesh.from_pydata(points,[],triangles);mesh.update()
bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table();bm.faces.ensure_lookup_table();bm.edges.ensure_lookup_table();bm.verts.index_update();bm.faces.index_update();bm.edges.index_update()
assert len(bm.faces)==len(faces)
for f,tri in zip(bm.faces,triangles):
    actual=[v.index for v in f.verts];assert any(actual==tri[i:]+tri[:i] for i in range(3)),'Unexpected source face order/identity'
boundary=[e for e in bm.edges if len(e.link_faces)==1];adjacency=defaultdict(list)
for e in boundary:
    a,z=[v.index for v in e.verts];adjacency[a].append((z,e));adjacency[z].append((a,e))
visited=set();components=[];tol=max(1e-7,float(np.ptp(p,axis=0).max())*1e-7)
for start in sorted(adjacency):
    if start in visited:continue
    pending=[start];vertices=set();edge_ids=set()
    while pending:
        v=pending.pop()
        if v in vertices:continue
        vertices.add(v);visited.add(v)
        for other,e in adjacency[v]:edge_ids.add(e.index);pending.append(other)
    row=dict(vertexIds=sorted(vertices),boundaryEdges=len(edge_ids),degrees={str(v):len(adjacency[v]) for v in sorted(vertices)},simpleCycle=all(len(adjacency[v])==2 for v in vertices))
    if not row['simpleCycle'] or len(vertices)<3:row['classification']='BRANCHED_OR_DEGENERATE_UNRESOLVED';components.append(row);continue
    edge=bm.edges[min(edge_ids)];face=edge.link_faces[0]
    loop=next(loop for loop in face.loops if loop.edge==edge);a=loop.vert.index;z=loop.link_loop_next.vert.index;order=[a];previous=a;current=z
    while current!=a:
        assert current not in order,'Non-simple boundary traversal';order.append(current)
        following=[v for v,e in adjacency[current] if v!=previous];assert len(following)==1
        previous,current=current,following[0]
    assert len(order)==len(vertices)
    ring=np.asarray([points[v] for v in order],float);center=ring.mean(axis=0);_,singular,axes=np.linalg.svd(ring-center,full_matrices=False);axis=axes[-1]
    area=np.cross(ring-center,np.roll(ring,-1,axis=0)-center).sum(axis=0)/2;area_length=float(np.linalg.norm(area));cap_normal=-area/area_length if area_length>0 else axis
    planar_error=float(np.abs((ring-center)@axis).max());third_distances=[];normal_axis=[];consistent=True;source_faces=[]
    for i,v in enumerate(order):
        other=order[(i+1)%len(order)];e=next(e for z,e in adjacency[v] if z==other);f=e.link_faces[0];face_vertices=[x.index for x in f.verts]
        consistent&=any(face_vertices[j]==v and face_vertices[(j+1)%3]==other for j in range(3));source_face=int(faces[f.index]);source_faces.append(source_face)
        for corner in range(3):
            original_vertex=ix[source_face,corner];canonical=table[tuple(map(float,p[original_vertex]))]
            if canonical in [v,other]:normal_axis.append(abs(float(np.dot(n[original_vertex],cap_normal))))
            elif canonical not in vertices:third_distances.append(float(np.dot(p[original_vertex]-center,cap_normal)))
    outward=bool(third_distances and max(third_distances)<-tol)
    radial=bool(normal_axis and max(normal_axis)<.15)
    row.update(orderedVertexIds=order,sourceNeighborFaceIds=source_faces,planarityTolerance=tol,maxPlanarDeviation=planar_error,projectedArea=area_length,planeSingularValues=singular.tolist(),boundaryOrientationConsistent=bool(consistent),hypotheticalOutwardCapNormal=cap_normal.tolist(),thirdVertexSignedDistances=third_distances,maxAbsOriginalBoundaryNormalDotCapNormal=max(normal_axis,default=None),localOutwardHalfspace=outward,radialBoundaryNormalWitness=radial)
    row['classification']='LOCAL_TUBULAR_OPENING_WITNESS_NOT_APPROVED' if planar_error<=tol and consistent and outward and radial and area_length>0 else 'SHEET_ATTACHMENT_OR_CURVED_AMBIGUOUS_UNRESOLVED'
    # A separate curved-hole hypothesis: no planarity/radial test is waived for
    # the tube witness above. Every new corner must reuse a complete original
    # field uniquely determined by BOTH source faces adjacent to its boundary.
    fields=defaultdict(dict)
    for source_face in source_faces:
        for original_vertex in ix[source_face]:
            original_vertex=int(original_vertex);canonical=table[tuple(map(float,p[original_vertex]))]
            if canonical in vertices:
                field=b''.join(np.asarray(a[original_vertex],dtype='<f4').tobytes() for a in (p,n,uv))
                fields[canonical].setdefault(field,original_vertex)
    ambiguous=[v for v in order if len(fields[v])!=1]
    alternatives=[]
    for v in ambiguous:
        ids=list(fields[v].values())
        alternatives.append(dict(boundaryVertexId=v,originalSourceVertexIds=ids,distinctFieldCount=len(ids),
            differingLanes=[name for name,array in [('POSITION',p),('NORMAL',n),('TEXCOORD_0',uv)] if len({np.asarray(array[i],dtype='<f4').tobytes() for i in ids})>1]))
    closure=dict(status='UNRESOLVED_ATTRIBUTE_CORRESPONDENCE' if ambiguous else 'NOT_TRIANGULATED',ambiguousVertexIds=ambiguous,attributeAlternatives=alternatives,originalVerticesOnly=True)
    if not ambiguous and consistent and area_length>0:
        projected=(ring-center)@axes[:2].T
        def intersects(a,b,c,d):
            def cross(x,y,z):return float(np.cross(y-x,z-x))
            # Collinear/contact non-neighbor edges are also ambiguous.
            values=[cross(a,b,c),cross(a,b,d),cross(c,d,a),cross(c,d,b)]
            eps=1e-14
            return (min(values[:2])<=eps and max(values[:2])>=-eps and min(values[2:])<=eps and max(values[2:])>=-eps and np.all(np.maximum(np.minimum(a,b),np.minimum(c,d))<=np.minimum(np.maximum(a,b),np.maximum(c,d))+eps))
        crossings=[]
        for i in range(len(order)):
            for j in range(i+1,len(order)):
                if j in [i,(i+1)%len(order)] or i==(j+1)%len(order):continue
                if intersects(projected[i],projected[(i+1)%len(order)],projected[j],projected[(j+1)%len(order)]):crossings.append([i,j])
        closure['projectedNonNeighborIntersections']=crossings
        if crossings:closure['status']='UNRESOLVED_PROJECTED_SELF_INTERSECTION'
        else:
            reverse_order=list(reversed(order));vectors=[Vector(points[v]) for v in reverse_order]
            cap_triangles=tessellate_polygon([vectors]);lookup={tuple(vec):v for vec,v in zip(vectors,reverse_order)}
            cap_ids=[[lookup[tuple(vec)] for vec in tri] for tri in cap_triangles]
            edge_count=defaultdict(int)
            for tri in cap_ids:
                for i in range(3):edge_count[(tri[i],tri[(i+1)%3])]+=1
            boundary_matched=all(edge_count[(order[(i+1)%len(order)],v)]==1 and edge_count[(v,order[(i+1)%len(order)])]==0 for i,v in enumerate(order))
            cap_vertices=[[next(iter(fields[v].values())) for v in tri] for tri in cap_ids]
            corner_dots=[];zero_area=[]
            for t,tri in enumerate(cap_vertices):
                q=np.asarray(p[tri],float);cross=np.cross(q[1]-q[0],q[2]-q[0]);length=float(np.linalg.norm(cross))
                if length<=1e-14:zero_area.append(t);corner_dots.extend([0.,0.,0.])
                else:corner_dots.extend(float(np.dot(n[v],cross/length)) for v in tri)
            closure.update(triangles=len(cap_ids),expectedTriangles=len(order)-2,originalSourceVertexTriangles=cap_vertices,reversedBoundaryMatched=boundary_matched,zeroAreaTriangleIds=zero_area,minOriginalNormalDotNewFace=min(corner_dots,default=None),nonPositiveNormalCorners=sum(x<=0 for x in corner_dots))
            closure['status']='CURVED_EXISTING_FIELD_CAP_HYPOTHESIS_NOT_APPROVED' if len(cap_ids)==len(order)-2 and boundary_matched and not zero_area and corner_dots and min(corner_dots)>0 else 'UNRESOLVED_CAP_WINDING_OR_ORIGINAL_NORMAL_FIELD'
    elif not ambiguous:closure['status']='UNRESOLVED_BOUNDARY_ORIENTATION_OR_AREA'
    row['curvedExistingFieldClosure']=closure
    components.append(row)
report=dict(status='BLENDER_SOURCE_STEM_BOUNDARIES_NOT_APPROVED',sourceSha256=s['sourceSha256'],mesh=node['name'],cropIndex=node['extras']['cropIndex'],stemTriangles=len(faces),wholeModelTriangles=len(ix),blenderVersion=bpy.app.version_string,blenderBuildHash=bpy.app.build_hash.decode(),boundaryEdges=len(boundary),nonManifoldJunctionEdges=sum(len(e.link_faces)>2 for e in bm.edges),components=components,
    limitations=['BMesh exact-coordinate diagnostic only; original PN/UV/index/driver/source asset unchanged, no normals recalculated or faces emitted.',
    'Local source-space witnesses do not prove global manifold/outward volume, original occlusion or semantic tube ownership.',
    'Cycles require explicit planarity, consistent directed boundary, adjacent third vertices in inward halfspace and radial original normal witness; remaining loops are not blindly capped.',
    'Curved closure is a separate reconstruction hypothesis with original PN/UV vertices, projected nonintersection, reversed boundary matching and strictly positive original normal corner dots; no cap is exported or approved.',
    'No image/view masks used. Any future closure needs original field/material identity, mappings for new growth/bridge faces, native Double-only quality then Front/shadow and net GPU gates.'])
(folder/'sorgo-stem-boundary-blender-diagnostic.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
bm.free();print(json.dumps({k:report[k] for k in ['status','stemTriangles','wholeModelTriangles','boundaryEdges','nonManifoldJunctionEdges']}));print(json.dumps([dict(edges=r['boundaryEdges'],classification=r['classification'],planarDeviation=r.get('maxPlanarDeviation'),normalAxisDot=r.get('maxAbsOriginalBoundaryNormalDotCapNormal')) for r in components]))
