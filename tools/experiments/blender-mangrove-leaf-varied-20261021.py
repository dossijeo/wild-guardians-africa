from pathlib import Path
import bpy,math,random,json
from mathutils import Vector
root=Path(__file__).resolve().parents[2];out=root/'public/assets/visual-lab/mangrove-leaf-varied-20261021';doc=root/'docs/qa/global-visual-lab/mangrove-leaf-varied-20261021'
assert not out.exists();out.mkdir(parents=True);doc.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(712);leaves=[]
for i in range(8):
 cx=((i%4)+.5)/4*.5-.25+rng.uniform(-.012,.012);cy=((i//4)+.5)/2*.5-.25+rng.uniform(-.015,.015)
 a=math.pi*.5+rng.uniform(-1.1,1.1);length=rng.uniform(.35,.4);width=rng.uniform(.20,.23)
 leaves.append((cx-math.cos(a)*length*.45,cy-math.sin(a)*length*.45,a,length,width,rng.uniform(.09,.16)))
result={}
for name,count,refined in [('near',8,True),('far',4,False)]:
 verts=[];faces=[]
 for x,y,a,length,width,height in (leaves if refined else [leaves[i] for i in [0,2,5,7]]):
  points=[(0,0,.015),(.45*length,-width*.5,height*.65),(length,0,height*.6),(.45*length,width*.5,height*.65)]
  if refined:points.append((length*.45,0,height))
  k=len(verts);ca,sa=math.cos(a),math.sin(a)
  verts.extend((x+px*ca-py*sa,y+px*sa+py*ca,pz) for px,py,pz in points)
  faces.extend(tuple(k+v for v in f) for f in ([(4,0,1),(4,1,2),(4,2,3),(4,3,0)] if refined else [(0,1,2),(0,2,3)]))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 mat=bpy.data.materials.new(name+' green');mat.diffuse_color=(.19,.38,.055,1);mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.19,.38,.055,1);obj.data.materials.append(mat)
 result[name]={'position':[c for v in mesh.vertices for c in (v.co.x,v.co.z,-v.co.y)],'normal':[c for v in mesh.vertices for c in (v.normal.x,v.normal.z,-v.normal.y)],'index':[c for f in faces for c in f],'leaves':count,'triangles':len(faces)}
 obj.hide_render=(name=='far');obj.select_set(name=='near')
(out/'modules.json').write_text(json.dumps(result,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
near=bpy.data.objects['near'];bpy.context.view_layer.objects.active=near
bpy.ops.export_scene.gltf(filepath=str(out/'near.glb'),use_selection=True,export_format='GLB')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
bpy.ops.object.camera_add(location=(.8,-.9,.85));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.04))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.9;scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=(1,-1,2));bpy.context.object.data.energy=100;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=2
scene.world.color=(.15,.15,.15);scene.render.image_settings.file_format='PNG';scene.render.filepath=str(doc/'module-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(doc/'modules.blend'));bpy.ops.render.render(write_still=True)
audit={'seed':712,'tileSpacing':.5,'nearTrianglesPerSquareUnit':32/.25,'farTrianglesPerSquareUnit':8/.25,'modules':{k:{'leaves':v['leaves'],'triangles':v['triangles'],'vertices':len(v['position'])//3,'min':[min(v['position'][axis::3]) for axis in range(3)],'max':[max(v['position'][axis::3]) for axis in range(3)]} for k,v in result.items()},'note':'Nominal spacing budget, not measured filled surface. No game integration or performance claim.'}
(doc/'audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8',newline='\n')
