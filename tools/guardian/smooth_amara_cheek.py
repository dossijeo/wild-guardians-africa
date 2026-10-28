"""Diagnostic cheek fairing experiment; NOT part of the accepted asset pipeline.
Neither depth fairing nor analytic-normal trial showed sufficient improvement.
Preserves UVs/topology; normals-only additionally preserves coordinates.
"""
import argparse,json,sys
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector
p=argparse.ArgumentParser()
for n in ('input','output','source-glb'):p.add_argument('--'+n,required=True)
p.add_argument('--normals-only',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);bpy.ops.wm.open_mainfile(filepath=str(Path(a.input).resolve()))
m=bpy.data.objects['Mesh0.001'];world=m.matrix_world.copy();inv=world.inverted()
points=[world@v.co for v in m.data.vertices];center=(-.16,1.17);radius=(.055,.045)
def features(v):
 x=(v.x-center[0])/.07;z=(v.z-center[1])/.08
 return [1,x,z,x*x,x*z,z*z]
fit=[v for v in points if -.235<v.x<-.09 and 1.09<v.z<1.26 and v.y<-.14]
coef=np.linalg.lstsq(np.array([features(v) for v in fit]),np.array([v.y for v in fit]),rcond=None)[0]
original_normals=[tuple(n.vector) for n in m.data.corner_normals];changes=[];influence={}
for i,v in enumerate(points):
 r=((v.x-center[0])/radius[0])**2+((v.z-center[1])/radius[1])**2
 if r>=1 or v.y>=-.14:continue
 weight=(1-r)**2;dy=max(-.006,min(.006,float(np.dot(features(v),coef))-v.y))*weight
 if abs(dy)<1e-7 and not a.normals_only:continue
 if a.normals_only:dy=0
 delta=inv.to_3x3()@Vector((0,dy,0))
 for shape in m.data.shape_keys.key_blocks:shape.data[i].co+=delta
 m.data.vertices[i].co=m.data.shape_keys.key_blocks[0].data[i].co
 influence[i]=weight;changes.append({'vertex':i,'depthChange':dy})
m.data.update();sums={}
key=lambda i:tuple(round(x,6) for x in m.data.vertices[i].co)
for face in m.data.polygons:
 for i in face.vertices:sums[key(i)]=sums.get(key(i),Vector())+face.normal*face.area
for face in m.data.polygons:
 for loop in face.loop_indices:
  i=m.data.loops[loop].vertex_index
  if i not in influence:continue
  normal=sums[key(i)].normalized();old=Vector(original_normals[loop])
  if a.normals_only:
   v=points[i];x=(v.x-center[0])/.07;z=(v.z-center[1])/.08
   dx=(coef[1]+2*coef[3]*x+coef[4]*z)/.07;dz=(coef[2]+coef[4]*x+2*coef[5]*z)/.08
   normal=world.to_3x3().transposed()@Vector((float(dx),-1,float(dz)));normal.normalize()
  original_normals[loop]=tuple(old.lerp(normal,min(1,influence[i]*2)).normalized())
m.data.normals_split_custom_set(original_normals)
out=Path(a.output).resolve();bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(out),compress=True)
bpy.ops.export_scene.gltf(filepath=str(out.with_suffix('.glb')),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_yup=True,export_skins=True,export_all_influences=False,export_extras=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False)
sys.path.insert(0,str(Path(__file__).resolve().parent));from restore_source_animations import restore
restore(a.source_glb,out.with_suffix('.glb'));out.with_suffix('.fairing.json').write_text(json.dumps({'center':center,'radius':radius,'changes':changes,'maxDepthChange':max(abs(c['depthChange']) for c in changes),'normalsOnly':a.normals_only,'scope':'Left cheek only; local surface fit; normals-only mode preserves all coordinates'},indent=2),encoding='utf-8')
