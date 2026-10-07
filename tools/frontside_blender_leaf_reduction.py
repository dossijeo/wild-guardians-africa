"""One disabled maize-mature remodelling experiment, not a runtime export.

Core/ground corners remain original. Each leaf driver is reduced independently
in Blender with its UV layer and custom normals. Corner data and driver labels
are archived for later controlled writing; no source/bridge mapping is reused
as though new topology were original. No visual quality is inferred here.
"""
import hashlib,json,sys
from pathlib import Path
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import numpy as np
from frontside_model_pilot import ROOT,read_glb,accessor

folder=ROOT/'docs/qa/frontside-model-pilot';receipt=next(r for r in json.loads((folder/'selective-candidate-receipts.json').read_text()) if r['category']=='crops')
raw,doc,binary=read_glb(ROOT/'public'/receipt['source'].lstrip('/'));assert hashlib.sha256(raw).hexdigest()==receipt['sourceSha256']
name='maiz_05_maduro';node=next(n for n in doc['nodes'] if n.get('name')==name);prim=doc['meshes'][node['mesh']]['primitives'][0]
assert 'skin' not in node and not prim.get('targets') and set(prim['attributes'])=={'POSITION','NORMAL','TEXCOORD_0'}
p=accessor(doc,binary,prim['attributes']['POSITION']);n=accessor(doc,binary,prim['attributes']['NORMAL']);uv=accessor(doc,binary,prim['attributes']['TEXCOORD_0']);ix=accessor(doc,binary,prim['indices']).reshape(-1,3)
bridges=json.loads((ROOT/'public/content/crop-bridges.json').read_text());model=node['extras']['cropIndex']*5+node['extras']['stage']-1;labels=np.asarray(bridges['models'][model]['faceLabels'])
assert len(labels)==len(ix)
corners=[];output_labels=[];source_core_faces=[];leaf_rows=[]
for face in np.flatnonzero(labels<2):
 corners.append(np.concatenate([p[ix[face]],n[ix[face]],uv[ix[face]]],axis=1).tolist());output_labels.append(int(labels[face]));source_core_faces.append(int(face))
for label in sorted(set(int(v) for v in labels if v>=2)):
 faces=np.flatnonzero(labels==label);old=np.unique(ix[faces]);local=np.searchsorted(old,ix[faces])
 mesh=bpy.data.meshes.new(name+'-leaf-'+str(label));mesh.from_pydata(p[old].tolist(),[],local.tolist());mesh.update()
 layer=mesh.uv_layers.new(name='OriginalAtlas')
 for poly in mesh.polygons:
  poly.use_smooth=True
  for loop in poly.loop_indices:layer.data[loop].uv=uv[old[mesh.loops[loop].vertex_index]].tolist()
 mesh.normals_split_custom_set_from_vertices(n[old].tolist())
 obj=bpy.data.objects.new(mesh.name,mesh);bpy.context.collection.objects.link(obj)
 modifier=obj.modifiers.new('Half leaf diagnostic','DECIMATE');modifier.ratio=.5;modifier.use_collapse_triangulate=True
 evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());reduced=evaluated.to_mesh();reduced.calc_loop_triangles()
 for triangle in reduced.loop_triangles:
  row=[]
  for loop in triangle.loops:
   vertex=reduced.loops[loop].vertex_index;row.append([*reduced.vertices[vertex].co,*reduced.corner_normals[loop].vector,*reduced.uv_layers['OriginalAtlas'].data[loop].uv])
  corners.append(row);output_labels.append(label)
 leaf_rows.append(dict(label=label,sourceFaces=len(faces),reducedFaces=len(reduced.loop_triangles),sourceVertices=len(old),reducedVertices=len(reduced.vertices)))
 evaluated.to_mesh_clear();bpy.data.objects.remove(obj,do_unlink=True);bpy.data.meshes.remove(mesh)
array=np.asarray(corners,dtype=np.float32);assert np.isfinite(array).all()
source_core=np.flatnonzero(labels<2)
assert array[:len(source_core)].tobytes()==np.concatenate([p[ix[source_core]],n[ix[source_core]],uv[ix[source_core]]],axis=2).tobytes()
new_leaf=sum(r['reducedFaces'] for r in leaf_rows);new_core=len(source_core)
payload=dict(status='BLENDER_REMODELLING_TRAINING_NOT_APPROVED',sourceSha256=receipt['sourceSha256'],mesh=name,ratio=.5,cornerLanes=['POSITIONxyz','NORMALxyz','UVxy'],faceLabels=output_labels,corners=corners,originalCoreFaceIds=source_core_faces,
 limitations=['Leaf decimation changes geometry, UV interpolation and custom normal interpolation; quality remains untested.', 'Original core corners exact; each leaf label processed separately, no driver boundary merging.', 'Reduced leaf faces require new bridge mappings; old IDs must not be reused. No production GLB/runtime or bridge data changed.', 'No reversed faces added yet; projected all-leaf reversal counts do not establish orientation, coverage or GPU benefit.'])
data=(json.dumps(payload,separators=(',',':'))+'\n').encode();sha=hashlib.sha256(data).hexdigest();archive=ROOT/'.cache/frontside-model-pilot/candidates/archive'/(sha+'.json');archive.write_bytes(data)
reversed_leaf=array[new_core:][:,[0,2,1],:].copy();reversed_leaf[:,:,3:6]*=-1
expanded=np.concatenate([array,reversed_leaf]);flags=np.zeros((len(expanded),3,1),np.float32);flags[len(array):]=1
lanes=np.concatenate([expanded,flags],axis=2).reshape(-1,9);unique=len({v.tobytes() for v in lanes})
source_bytes=p.nbytes+n.nbytes+uv.nbytes+ix.nbytes;projected_bytes=unique*36+len(expanded)*3*(2 if unique<=65535 else 4)
report=dict(status='LEAF_REMODELLING_COST_DIAGNOSIS_NOT_APPROVAL',sourceSha256=receipt['sourceSha256'],mesh=name,blenderVersion=bpy.app.version_string,blenderBuildHash=bpy.app.build_hash.decode(),leafRatio=.5,sourceTriangles=len(ix),sourceCoreTriangles=new_core,sourceLeafTriangles=int(np.sum(labels>=2)),reducedForwardTriangles=len(corners),projectedAllLeafReverseTriangles=new_core+2*new_leaf,projectedTriangleChangePercent=100*((new_core+2*new_leaf)/len(ix)-1),sourceStateGeometryBytes=source_bytes,projectedReverseStateVertices=unique,projectedReverseStateGeometryBytes=projected_bytes,projectedStateByteChangePercent=100*(projected_bytes/source_bytes-1),leaves=leaf_rows,archive=str(archive.relative_to(ROOT)).replace('\\','/'),archiveSha256=sha,limitations=payload['limitations'])
(folder/'maize-blender-leaf-reduction-diagnostic.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
