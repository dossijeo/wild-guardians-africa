"""Disabled leaf-only derivative with exact core and checked chart boundaries.

Two weight conventions are audited prospectively, without any image/view input.
Weighting is not treated as a lock: every original open/non-manifold boundary
edge must survive at exact float32 P/UV, or the structural proposal is rejected.
"""
import hashlib, json, sys
from collections import Counter, defaultdict
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from mathutils.bvhtree import BVHTree
from frontside_model_pilot import ROOT,read_glb,accessor

folder=ROOT/'docs/qa/frontside-model-pilot'
source=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text(encoding='utf8')) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/source['source'].lstrip('/')); assert hashlib.sha256(raw).hexdigest()==source['sourceSha256']
node=next(n for n in doc['nodes'] if n.get('name')=='maiz_05_maduro');prim=doc['meshes'][node['mesh']]['primitives'][0]
p,n,u=[accessor(doc,binary,prim['attributes'][k]) for k in ['POSITION','NORMAL','TEXCOORD_0']]
ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text(encoding='utf8'))
labels=np.asarray(bridges['models'][node['extras']['cropIndex']*5+node['extras']['stage']-1]['faceLabels'])
core=np.flatnonzero(labels<2);stem=np.flatnonzero(labels==1);leaf_total=int(np.sum(labels>=2))
maximum_leaf=int(len(ix)*1.1)-int(np.sum(labels==0))-2*len(stem);ratio=maximum_leaf/leaf_total
assert maximum_leaf>0 and 0<ratio<1
core_corners=np.concatenate([p[ix[core]],n[ix[core]],u[ix[core]]],axis=2).astype(np.float32)

def point_key(v): return v[[0,1,2,6,7]].astype(np.float32).tobytes()
def edge_key(a,b): return tuple(sorted((a,b)))
def unit(v):
    length=float(np.linalg.norm(v)); assert np.isfinite(v).all() and length>1e-8
    return np.asarray(v/length,np.float32)

results=[]
for convention in ['HIGH_WEIGHT_BOUNDARY','HIGH_WEIGHT_INTERIOR']:
    corners=core_corners.tolist();out_labels=labels[core].tolist();leaf_rows=[]
    for label in sorted(set(int(v) for v in labels if v>=2)):
        faces=np.flatnonzero(labels==label);old=np.unique(ix[faces]);local=np.searchsorted(old,ix[faces])
        ownership=Counter(edge_key(int(a),int(b)) for tri in local for a,b in zip(tri,np.roll(tri,-1)))
        boundary_edges=[edge for edge,count in ownership.items() if count!=2]
        boundary_vertices={v for edge in boundary_edges for v in edge}
        lookup=defaultdict(dict);tri_lookup=defaultdict(dict)
        for vertex in old:
            key=np.concatenate([p[vertex],u[vertex]]).astype(np.float32).tobytes();lookup[key][n[vertex].tobytes()]=n[vertex].copy()
        for face in faces:
            keys=np.concatenate([p[ix[face]],u[ix[face]]],axis=1).astype(np.float32)
            for rotate in range(3):
                order=np.roll(np.arange(3),-rotate);field=n[ix[face]][order].copy()
                tri_lookup[keys[order].tobytes()][field.tobytes()]=field
        source_boundary={edge_key(np.concatenate([p[old[a]],u[old[a]]]).astype(np.float32).tobytes(),np.concatenate([p[old[b]],u[old[b]]]).astype(np.float32).tobytes()) for a,b in boundary_edges}
        # Separate real coordinate/chart interfaces from indexed cuts. This
        # diagnostic does not silently weaken the conservative constraint.
        original_rows=np.concatenate([p[ix[faces]],n[ix[faces]],u[ix[faces]]],axis=2).astype(np.float32)
        boundary_domains={}
        for domain,lanes in [('POSITION',[0,1,2]),('POSITION_UV',[0,1,2,6,7]),('POSITION_NORMAL_UV',list(range(8)))]:
            counts=Counter(edge_key(a[lanes].tobytes(),b[lanes].tobytes()) for tri in original_rows for a,b in zip(tri,np.roll(tri,-1,axis=0)))
            boundary_domains[domain]=dict(singleOwnerEdges=sum(v==1 for v in counts.values()),moreThanTwoOwnerEdges=sum(v>2 for v in counts.values()),twoOwnerEdges=sum(v==2 for v in counts.values()))
        tree=BVHTree.FromPolygons(p[old].tolist(),local.tolist(),all_triangles=True)
        mesh=bpy.data.meshes.new(f'leaf-{label}-{convention}');mesh.from_pydata(p[old].tolist(),[],local.tolist());mesh.update()
        uv=mesh.uv_layers.new(name='OriginalAtlas');field=mesh.attributes.new(name='OriginalNormalField',type='FLOAT_VECTOR',domain='POINT')
        for vertex in range(len(old)):field.data[vertex].vector=n[old[vertex]].tolist()
        for poly in mesh.polygons:
            poly.use_smooth=True
            for loop in poly.loop_indices:uv.data[loop].uv=u[old[mesh.loops[loop].vertex_index]].tolist()
        obj=bpy.data.objects.new(mesh.name,mesh);bpy.context.collection.objects.link(obj)
        group=obj.vertex_groups.new(name='BoundaryConstraintDiagnostic')
        high=boundary_vertices if convention=='HIGH_WEIGHT_BOUNDARY' else set(range(len(old)))-boundary_vertices
        if high:group.add(sorted(high),1.0,'REPLACE')
        modifier=obj.modifiers.new('Conservative leaf budget','DECIMATE');modifier.ratio=ratio;modifier.use_collapse_triangulate=True
        modifier.vertex_group=group.name;modifier.vertex_group_factor=1000
        evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());reduced=evaluated.to_mesh();reduced.calc_loop_triangles()
        transported=reduced.attributes.get('OriginalNormalField');assert transported is not None and transported.domain=='POINT'
        array=[];restored_triangle=restored_anchor=ambiguous=unmapped=0;distances=[]
        for triangle in reduced.loop_triangles:
            row=[]
            for loop in triangle.loops:
                vertex=reduced.loops[loop].vertex_index;position=reduced.vertices[vertex].co
                row.append([*position,*unit(np.asarray(transported.data[vertex].vector,np.float32)),*reduced.uv_layers['OriginalAtlas'].data[loop].uv])
                distances.append(tree.find_nearest(position)[3])
            row=np.asarray(row,np.float32)
            matches=tri_lookup.get(row[:,[0,1,2,6,7]].tobytes(),{})
            if len(matches)==1:row[:,3:6]=next(iter(matches.values()));restored_triangle+=3
            else:
                for corner in row:
                    values=lookup.get(point_key(corner),{})
                    if len(values)==1:corner[3:6]=next(iter(values.values()));restored_anchor+=1
                    elif values:ambiguous+=1
                    else:unmapped+=1
            array.append(row)
            center=sum((reduced.vertices[v].co for v in triangle.vertices),start=reduced.vertices[triangle.vertices[0]].co*0)/3
            distances.append(tree.find_nearest(center)[3])
        array=np.asarray(array,np.float32);assert np.isfinite(array).all()
        output_edges={edge_key(point_key(a),point_key(b)) for tri in array for a,b in zip(tri,np.roll(tri,-1,axis=0))}
        missing=source_boundary-output_edges
        corners.extend(array.tolist());out_labels.extend([label]*len(array))
        leaf_rows.append(dict(label=label,sourceFaces=len(faces),derivedFaces=len(array),sourceBoundaryEdges=len(source_boundary),boundaryMeaning='Conservative indexed cuts checked at exact P/UV; not all are physical silhouette boundaries.',exactBoundaryDomains=boundary_domains,missingExactBoundaryEdges=len(missing),boundaryPass=not missing,restoredExactTriangleCorners=restored_triangle,restoredUniqueAnchorCorners=restored_anchor,ambiguousAnchorCorners=ambiguous,newUnmappedCorners=unmapped,maxSampledDistance=max(distances,default=0),meanSampledDistance=sum(distances)/max(1,len(distances))))
        evaluated.to_mesh_clear();bpy.data.objects.remove(obj,do_unlink=True);bpy.data.meshes.remove(mesh)
    array=np.asarray(corners,np.float32);assert array[:len(core)].tobytes()==core_corners.tobytes()
    unique=len({v.tobytes() for v in array.reshape(-1,8)});bilateral_triangles=len(array)+len(stem)
    state_bytes=unique*32+bilateral_triangles*3*(2 if unique<=65535 else 4);source_bytes=p.nbytes+n.nbytes+u.nbytes+ix.nbytes
    payload=dict(status='BORDER_CONSTRAINED_LEAF_DERIVATIVE_NOT_APPROVED',sourceSha256=source['sourceSha256'],mesh=node['name'],ratio=ratio,boundaryWeightConvention=convention,faceLabels=out_labels,corners=corners,originalCoreFaceIds=core.tolist(),limitations=['Every original soil/stem corner is bit-exact; future stem reverses include ALL original stem triangles.', 'Leaves remain DoubleSide; each original driver is processed independently, no saved view/visibility masks.', 'POINT field transport at new vertices is a derived field, not verified original chart correspondence.', 'Exact original triangles/unique P+UV anchors restore original Nbits; ambiguous/new corners retain normalized transported fields.', 'Boundary weighting is not a lock; missing exact source P+UV boundary edges REJECT this structural proposal.', 'No original GLB, runtime states or bridge mappings changed; new leaf topology requires new bridge correspondence.'])
    data=(json.dumps(payload,separators=(',',':'))+'\n').encode();sha=hashlib.sha256(data).hexdigest();archive=ROOT/'.cache/frontside-model-pilot/candidates/archive'/(sha+'.json');archive.write_bytes(data)
    results.append(dict(convention=convention,archive=str(archive.relative_to(ROOT)).replace('\\','/'),archiveSha256=sha,archiveBytes=len(data),ratio=ratio,sourceLeafTriangles=leaf_total,maximumLeafTriangles=maximum_leaf,derivedLeafTriangles=len(array)-len(core),proposedBilateralTriangles=bilateral_triangles,triangleBudgetPass=bilateral_triangles<=len(ix)*1.1,sourceStateBytes=source_bytes,proposedSharedStateBytes=state_bytes,bufferBudgetPass=state_bytes<=source_bytes*1.1,boundaryPass=all(r['boundaryPass'] for r in leaf_rows),leaves=leaf_rows,limitations=payload['limitations']))
report=dict(status='BORDER_AND_FIELD_CONSTRAINED_OFFLINE_PROPOSALS_NOT_APPROVED',sourceSha256=source['sourceSha256'],blenderVersion=bpy.app.version_string,blenderBuildHash=bpy.app.build_hash.decode(),rows=results,limitations=['Single mature state only; sampled geometry distances do not bound image/silhouette, normal/TBN/UV/material quality, shadows or continuous growth.', 'No native quality, category or GPU resource/timing approval; structural/resource failure prevents native expansion.', 'Weight conventions are predeclared structural diagnostics, not alternative acceptance profiles or rerolls.'])
(folder/'maize-leaf-border-budget-diagnostic.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:report[k] for k in ['status','blenderVersion']}));print(json.dumps([{k:r[k] for k in ['convention','derivedLeafTriangles','proposedBilateralTriangles','triangleBudgetPass','proposedSharedStateBytes','bufferBudgetPass','boundaryPass','archiveSha256']} for r in results]))
