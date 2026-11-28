"""Transfer the repacked atlas onto the ORIGINAL complete savanna GLB.
Triangle/corner correspondence uses normalized geometric positions, never vertex IDs.
Does not install or replace the different production trees.
"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'tools/trees'))
from tree_transfer_common import *
from mathutils.geometry import barycentric_transform, closest_point_on_tri
hd=components(HD)
material=next(o.data.materials[0] for o in bpy.context.scene.objects if o.type=='MESH')
material.use_fake_user=True
for ob in list(bpy.context.scene.objects):bpy.data.objects.remove(ob,do_unlink=True)
original=components(args.source,reset=False)
def fingerprint():
 h=hashlib.sha256()
 for ob in bpy.context.scene.objects:
  if ob.type!='MESH':continue
  for v in ob.data.vertices:h.update(struct.pack('<3f',*v.co))
  for p in ob.data.polygons:h.update(struct.pack('<'+str(len(p.vertices))+'I',*p.vertices))
  for row in ob.matrix_world:h.update(struct.pack('<4f',*row))
 return h.hexdigest()
before=fingerprint();report=[]
for k,donor in enumerate(hd):
 bvh=BVHTree.FromPolygons(donor['verts'],donor['faces'],all_triangles=True)
 matches=[]
 for j,target in enumerate(original):
  distances=[bvh.find_nearest(v)[3] for v in target['verts']]
  matches.append((max(distances),j))
 error,j=min(matches);target=original[j]
 if error>1e-5:raise RuntimeError(f'No complete reverse correspondence for tree {k}: {error}')
 reverse=BVHTree.FromPolygons(target['verts'],target['faces'],all_triangles=True)
 reverseError=max(reverse.find_nearest(v)[3] for v in donor['verts'])
 if reverseError>1e-5:raise RuntimeError('Donor surface is not completely covered')
 ob=bpy.data.objects[target['object']];mesh=ob.data
 if material.name not in mesh.materials:mesh.materials.append(material)
 materialIndex=next(i for i,m in enumerate(mesh.materials) if m==material)
 maxUVerror=0;changed=0
 for localFace,polygonIndex in enumerate(target['polygonIndices']):
  face=target['faces'][localFace];verts=[target['verts'][v] for v in face]
  center=sum(verts,Vector())/len(verts)
  point,normal,donorFace,distance=bvh.find_nearest(center)
  sourceVerts=[donor['verts'][i] for i in donor['faces'][donorFace]]
  sourceUV=[Vector((uv[0],uv[1],0)) for uv in donor['uv'][donorFace]]
  if len(sourceVerts)!=3:raise RuntimeError('Non triangular donor')
  for li,v in zip(mesh.polygons[polygonIndex].loop_indices,verts):
   nearest=(v-closest_point_on_tri(v,*sourceVerts)).length;maxUVerror=max(maxUVerror,nearest,distance)
   # The centroid chooses the correct side of seams; each corner is interpolated
   # on that triangle so shared position indices cannot select the wrong UV island.
   uv=barycentric_transform(v,*sourceVerts,*sourceUV)
   mesh.uv_layers.active.data[li].uv=(uv.x,uv.y);changed+=1
  mesh.polygons[polygonIndex].material_index=materialIndex
 if maxUVerror>1e-5:raise RuntimeError('Triangle coverage failed')
 report.append({'tree':k+1,'originalComponent':j,'corners':changed,'maxNormalizedSurfaceError':maxUVerror,'reverseSurfaceError':reverseError})
assert before==fingerprint(),'Geometry was modified'
out=args.output;out.mkdir(parents=True,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(out/'sabana-original-hd.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'sabana-original-hd.glb'),export_format='GLB',export_yup=True)
(out/'verification.json').write_text(json.dumps({'source':str(args.source),'donor':str(HD),'geometryBefore':before,'geometryAfter':fingerprint(),'trees':report,'installedInGame':False},indent=2))
print(json.dumps(report,indent=2))
