"""Classify the visible side gap against the intended oral front aperture."""
import bpy,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
root=Path.cwd();bpy.ops.wm.open_mainfile(filepath=str(root/'test-results/olderMale-oral-v1.blend'))
for o in bpy.context.scene.objects:
 if o.animation_data:o.animation_data_clear()
 if o.type=='ARMATURE':
  for b in o.pose.bones:b.matrix_basis.identity()
 if o.type=='MESH' and o.data.shape_keys:
  for k in o.data.shape_keys.key_blocks:k.value=1 if k.name=='mouthOpen' else 0
bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();o=bpy.data.objects['WorkerOralAnatomy'];e=o.evaluated_get(dg);m=e.to_mesh();points=[e.matrix_world@v.co for v in m.vertices]
report=json.loads((root/'test-results/olderMale-oral-v1.json').read_text());n=report['lipVertices']
# Temporary ray-test cap only. Never added to the model or rendered.
cap=BVHTree.FromPolygons(points[:2*n],[(i,i+1,2*n-2-i,2*n-1-i) for i in range(n-1)])
center=Vector((0,-.25,1.065));extent=.35;direction=Vector((1,0,.05)).normalized();camera=center+direction*extent*4;rotation=(center-camera).to_track_quat('-Z','Y');ray=rotation@Vector((0,0,-1));rows=[]
for x,y in [(380,400),(390,390),(400,380),(410,390)]:
 origin=camera+rotation@Vector(((x+.5)/768*extent-extent/2,extent/2-(y+.5)/768*extent,0));hit,location,normal,index,obj,matrix=bpy.context.scene.ray_cast(dg,origin,ray)
 crossings=[];start=origin
 for _ in range(5):
  p,_,_,d=cap.ray_cast(start,ray)
  if p is None:break
  crossings.append(list(p));start=p+ray*.00001
 rows.append({'pixel':[x,y],'solidHit':hit,'object':obj.name if hit else None,'frontApertureCrossings':crossings})
e.to_mesh_clear();out=root/'docs/guardian/phase2/face-authoring/olderMale/side-aperture-rays.json';out.write_text(json.dumps({'scope':'Four side-camera pixel rays; temporary aperture cap used only for diagnosis','rays':rows},indent=2));print(rows)
