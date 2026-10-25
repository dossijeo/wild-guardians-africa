from pathlib import Path
import bpy,random,math,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/assets/visual-lab/continuous-grass-cards';DOC=ROOT/'docs/qa/global-visual-lab/continuous-grass-cards'
OUT.mkdir(parents=True,exist_ok=True);DOC.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(712)
# Offline geometry rendered to a reusable coverage atlas: 24 independent fine fibers.
for j in range(24):
 x=rng.uniform(-.17,.17);y=rng.uniform(-.015,.015);h=rng.uniform(.19,.35);width=rng.uniform(.007,.012);lean=rng.uniform(-.065,.065)
 verts=[];faces=[]
 for k in range(5):
  t=k/5;w=width*(1-t)**.7
  verts.extend([(x+lean*t*t-w/2,y,h*t),(x+lean*t*t+w/2,y,h*t)])
 verts.append((x+lean,y,h))
 for k in range(4):faces.extend([(k*2,k*2+1,k*2+2),(k*2+1,k*2+3,k*2+2)])
 faces.append((8,9,10))
 mesh=bpy.data.meshes.new('fiber');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('fiber-%02d'%j,mesh);bpy.context.collection.objects.link(o)
 mat=bpy.data.materials.new('fiber-tone');mat.use_nodes=True;n=mat.node_tree.nodes;n.clear();out=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission');v=rng.uniform(.55,.95);em.inputs['Color'].default_value=(v,v,v,1);mat.node_tree.links.new(em.outputs[0],out.inputs['Surface']);o.data.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.render.resolution_x=256;scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard'
camdata=bpy.data.cameras.new('atlas-camera');camera=bpy.data.objects.new('atlas-camera',camdata);bpy.context.collection.objects.link(camera);camera.location=(0,-2,.2);camera.rotation_euler=(Vector((0,0,.2))-camera.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=.4;scene.camera=camera
scene.render.filepath=str(OUT/'fibers.png');bpy.ops.render.render(write_still=True);bpy.ops.wm.save_as_mainfile(filepath=str(DOC/'atlas.blend'))
result={}
for name,count in [('light',2),('refined',3)]:
 pos=[];flat=[];roots=[];uv=[];carduv=[];normal=[];indices=[]
 for j in range(count):
  x,z,a=[(-.10,-.08,.1),(.10,.04,1.7),(0,.13,2.8)][j];ca,sa=math.cos(a),math.sin(a);base=len(pos)//3
  for t in [0,.4,.75,1]:
   for u in [0,1]:
    lateral=(u-.5)*.4;bend=.075*t*t;straight=.075*t
    pos.extend([x+ca*lateral-sa*bend,.4*t,z+sa*lateral+ca*bend]);flat.extend([x+ca*lateral-sa*straight,.4*t,z+sa*lateral+ca*straight]);roots.extend([x+ca*lateral,0,z+sa*lateral]);uv.extend([t,8/12 if j==2 else j/12]);carduv.extend([u,t]);normal.extend([-sa,-.375*t,ca])
  for k in range(3):indices.extend([base+k*2,base+k*2+1,base+k*2+2,base+k*2+1,base+k*2+3,base+k*2+2])
 result[name]=dict(position=pos,normal=normal,flatPosition=flat,bladeRoot=roots,uv=uv,cardUv=carduv,index=indices,blades=count*24,triangles=len(indices)//3)
(OUT/'modules.json').write_text(json.dumps(result,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
(DOC/'mesh-audit.json').write_text(json.dumps({k:{'cards':2 if k=='light'else 3,'apparentFibers':v['blades'],'triangles':v['triangles'],'vertices':len(v['position'])//3}for k,v in result.items()},indent=2)+'\n',encoding='utf-8',newline='\n')
