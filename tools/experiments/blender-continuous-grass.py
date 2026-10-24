from pathlib import Path
import bpy,random,math,json
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/assets/visual-lab/continuous-grass';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(712);blades=[]
for j in range(12):
 x=((j%4)+rng.uniform(.15,.85))/4*.4-.2;z=((j//4)+rng.uniform(.15,.85))/3*.4-.2
 a=rng.random()*math.tau;h=rng.uniform(.26,.42);w=rng.uniform(.045,.07);lean=rng.uniform(.09,.16)
 blades.append((x,z,a,h,w,lean))
result={}
for name,count,refined in [('light',8,False),('refined',12,True)]:
 vertices=[];flat=[];roots=[];uv=[];faces=[]
 for j,(x,z,a,h,w,lean)in enumerate(blades[:count]):
  # Interleave the first eight over the full tile, not only two rows.
  if j<8:z=((j%3)+.5)/3*.4-.2
  ca,sa=math.cos(a),math.sin(a);base=len(vertices)
  rings=[(0,-1),(0,1),(.4,-.7),(.4,.7),(.75,-.35),(.75,.35),(1,0)]if refined else[(0,-1),(0,1),(1,0)]
  for t,side in rings:
   bend=lean*(2.3 if refined else 1)*t*t;straight=lean*t
   vertices.append((x+ca*bend-sa*w*.5*side,z+sa*bend+ca*w*.5*side,h*t*(.85 if refined else 1)))
   flat.append((x+ca*straight-sa*w*.5*side,h*t,z+sa*straight+ca*w*.5*side));roots.append((x,0,z));uv.append((t,j/12))
  faces.extend([tuple(base+k for k in f)for f in ([(0,1,2),(1,3,2),(2,3,4),(3,5,4),(4,5,6)]if refined else[(0,1,2)])])
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 result[name]=dict(position=[v for p in vertices for v in (p[0],p[2],p[1])],normal=[v for n in mesh.vertices for v in (n.normal.x,n.normal.z,n.normal.y)],flatPosition=[v for p in flat for v in p],bladeRoot=[v for p in roots for v in p],uv=[v for p in uv for v in p],index=[v for f in faces for v in f],blades=count,triangles=len(faces))
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
(OUT/'modules.json').write_text(json.dumps(result,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'docs/qa/global-visual-lab/continuous-grass/modules.blend'))
(ROOT/'docs/qa/global-visual-lab/continuous-grass/mesh-audit.json').write_text(json.dumps({k:{'blades':v['blades'],'triangles':v['triangles'],'vertices':len(v['position'])//3}for k,v in result.items()},indent=2)+'\n',encoding='utf-8',newline='\n')
