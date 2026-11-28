"""Diagnostic rays: distinguish skin cracks from crossing the curved mouth entrance."""
import bpy,sys,json,argparse
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--seam',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
for o in bpy.context.scene.objects:
 if o.animation_data:o.animation_data_clear()
 if o.type=='ARMATURE':
  for b in o.pose.bones:b.matrix_basis.identity()
 if o.type=='MESH' and o.data.shape_keys:
  for k in o.data.shape_keys.key_blocks:k.value=1 if k.name=='mouthOpen' else 0
bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
oral=bpy.data.objects['WorkerOralAnatomy'];evaluated=oral.evaluated_get(dg);m=evaluated.to_mesh()
report=json.loads(Path(a.seam).read_text());n=report['lipVertices'];points=[oral.matrix_world@v.co for v in m.vertices[:2*n]]
faces=[]
for i in range(n-1):
 j=2*n-1-i;faces.extend([(i,i+1,j-1),(i,j-1,j)])
aperture=BVHTree.FromPolygons(points,faces,all_triangles=True)
center=Vector((0,-.20,1.24));extent=.38;camera=center+Vector((1,0,.05)).normalized()*extent*4;rotation=(center-camera).to_track_quat('-Z','Y');direction=rotation@Vector((0,0,-1))
rows=[]
for x,y in [(310,440),(320,440),(335,430),(345,450),(360,480),(280,395)]:
 origin=camera+rotation@Vector(((x+.5)/768*extent-extent/2,extent/2-(y+.5)/768*extent,0))
 hit,pos,normal,index,obj,_=bpy.context.scene.ray_cast(dg,origin,direction)
 hits=[];start=origin.copy()
 for _ in range(8):
  loc,_,face,d=aperture.ray_cast(start,direction)
  if loc is None:break
  hits.append({'distance':(loc-origin).length,'position':list(loc),'triangle':face});start=loc+direction*.00001
 rows.append({'pixel':[x,y],'sceneHit':obj.name if hit else None,'apertureCrossings':hits})
evaluated.to_mesh_clear()
Path(a.output).write_text(json.dumps({'input':a.input,'camera':'side closeup, 768px, center (0,-.20,1.24), extent .38','rays':rows},indent=2),encoding='utf-8');print(json.dumps(rows,indent=2))
