from pathlib import Path
import bpy,math,random,json
root=Path(__file__).resolve().parents[2];out=root/'public/assets/visual-lab/mangrove-leaf-cupped-20261022';doc=root/'docs/qa/global-visual-lab/mangrove-leaf-cupped-20261022'
out.mkdir(parents=True,exist_ok=True);doc.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
rng=random.Random(712);leaves=[]
for i in range(8):
 cx=((i%4)+.5)/4*.5-.25+rng.uniform(-.012,.012);cy=((i//4)+.5)/2*.5-.25+rng.uniform(-.015,.015)
 a=math.pi*.5+rng.uniform(-.3,.3);length=rng.uniform(.35,.4);width=rng.uniform(.20,.23)
 leaves.append((cx-math.cos(a)*length*.45,cy-math.sin(a)*length*.45,a,length,width,rng.uniform(.055,.095)))
result={}
for name,ids in [('refined',list(range(8))),('light',[0,2,5,7])]:
 verts=[];faces=[];roots=[];uv=[]
 for leaf in ids:
  x,y,a,length,width,height=leaves[leaf];points=[(0,0,.015),(.28*length,-width*.38,height*.5),(.65*length,-width*.42,height*.6),(length,0,height*.6),(.65*length,width*.42,height*.6),(.28*length,width*.38,height*.5),(.5*length,0,height*1.8)]
  k=len(verts);ca,sa=math.cos(a),math.sin(a)
  verts.extend((x+px*ca-py*sa,y+px*sa+py*ca,pz) for px,py,pz in points)
  faces.extend((k+6,k+i,k+(i+1)%6) for i in range(6))
  for v in range(7):roots.extend([x,.015,-y]);uv.extend([0 if v==0 else(.45 if v==6 else 1),.2 if leaf in [0,2,5,7] else .9])
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 pos=[c for v in mesh.vertices for c in (v.co.x,v.co.z,-v.co.y)];norm=[c for v in mesh.vertices for c in (v.normal.x,v.normal.z,-v.normal.y)]
 result[name]=dict(position=pos,flatPosition=pos,normal=norm,flatNormal=norm,bladeRoot=roots,uv=uv,index=[c for f in faces for c in f])
(out/'modules.json').write_text(json.dumps(result,separators=(',',':'))+'\n',encoding='utf8',newline='\n')
bpy.ops.wm.save_as_mainfile(filepath=str(doc/'modules.blend'))
(doc/'asset-audit.json').write_text(json.dumps({k:dict(vertices=len(v['position'])//3,triangles=len(v['index'])//3) for k,v in result.items()},indent=2)+'\n',encoding='utf8',newline='\n')
