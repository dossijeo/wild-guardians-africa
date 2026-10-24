"""Rear painted motifs, friezes and porch joinery; explicit original landmarks."""
from pathlib import Path
import bpy,numpy as np,json
R=Path(__file__).resolve().parents[2];O=R/'docs/qa/global-visual-lab/workshop-details';O.mkdir(parents=True,exist_ok=True)
path=R/'public/assets/visual-lab/mapu-0-surface.bin';n=(path.stat().st_size-7992*12)//32
a=np.fromfile(path,dtype='<f4',count=n*8).reshape(-1,8);t=np.fromfile(path,dtype='<u4',offset=n*32).reshape(-1,3)
image=bpy.data.images.load(str(R/'docs/qa/global-visual-lab/workshop-surfaces/mapu-0-color-rear.png'))
src=np.array(image.pixels[:],np.float32).reshape(2048,2048,4)[::-1].copy();pixels=src.copy()
prior=json.loads((R/'docs/qa/global-visual-lab/workshop-surfaces/surface-audit.json').read_text())['faceSelections'];cloth=set(prior['cloth-top']+prior['cloth-hem'])
pots=json.loads((R/'docs/qa/global-visual-lab/workshop-shared/accessory-audit.json').read_text())['faceSelections'];pots=set(pots['left-pot']+pots['right-pot'])
names=['protected','rear-left-sun','rear-right-sun','rear-door-banner','rear-vertical-wood','rear-crossbar','rear-clay','front-frieze','rear-frieze','porch-upright-wood','porch-horizontal-wood'];selection={n:[] for n in names};kinds=[];covered=np.zeros((2048,2048),bool)
def smooth(a,b,x):
 q=np.clip((x-a)/(b-a),0,1);return q*q*(3-2*q)
def world(point):return np.array([point[0]/1199*.30-.87,.085-point[1]/999*.255])
landmarks={1:((277,695),[(234,647),(277,620),(320,646),(330,693),(312,735),(272,750),(231,734),(218,695)]),2:((1055,693),[(1016,650),(1057,620),(1097,648),(1110,691),(1094,733),(1054,749),(1010,734),(996,693)]),3:((686,675),[(645,625),(690,607),(725,635),(750,677),(717,718),(676,729),(643,710),(629,675)])}
def solar(pos,k):
 center,points=landmarks[k];center=world(center);d=pos[...,:2]-center
 rx,ry=(.0082,.0103) if k==3 else (.0100,.0115);r=np.sqrt((d[...,0]/rx)**2+(d[...,1]/ry)**2);r/=1+.035*np.sin(np.arctan2(d[...,1],d[...,0])*3+.4)
 ring=smooth(.55,.67,r)*(1-smooth(.94,1.06,r));rays=np.zeros(r.shape)
 for px,py in points:
  end=world((px,py));vec=end-center;start=center+vec*.77;end=center+vec*1.04;v=end-start;f=np.clip(np.sum((pos[...,:2]-start)*v,-1)/np.dot(v,v),0,1);dist=np.linalg.norm(pos[...,:2]-start-f[...,None]*v,axis=-1)
  rays=np.maximum(rays,1-smooth(.0010,.0017,dist))
 return r,ring,rays
for face,ids in enumerate(t):
 p=a[ids,:3];x,y,z=p.mean(0);normal=a[ids,3:6].mean(0);uv=a[ids,6:8]*2047;cu=np.clip(uv.mean(0).astype(int),0,2047);c=src[cu[1],cu[0],:3];ratio=c[1]/max(c[0],.001)
 rear=z<-.258 and normal[2]<-.25;front=z>.005 and normal[2]>.25
 pillar=rear and -.151<y<-.051
 banner=rear and -.725<x<-.674 and -.137<y<-.044
 wood=rear and -.779<x<-.638 and -.146<y<.037
 gable=rear and -.738<x<-.661 and -.033<y<.026 and .32<ratio<.85
 clay=rear and -.85<x<-.58 and y>-.052 and ratio<.43
 frieze=face not in pots and (front or rear) and -.139<y<-.113 and ((x<(-.779 if front else -.763)) or (x>(-.655 if front else -.637)))
 porch=face not in cloth and -.944<x<-.826 and -.146<y<-.045 and -.225<z<-.045 and .40<ratio<.84
 cross=face not in cloth and -.966<x<-.824 and -.043<y<.016 and -.225<z<-.045 and .43<ratio<.80
 k=7 if frieze and front else 8 if frieze else 1 if pillar and x<-.763 else 2 if pillar and x>-.637 else 3 if banner else 5 if wood and -.048<y<-.027 else 4 if wood or gable else 6 if clay else 10 if cross or (porch and normal[1]>.5) else 9 if porch else 0
 kinds.append(k);selection[names[k]].append(face)
 lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),2047);xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));d=uv[1]-uv[0];e=uv[2]-uv[0];det=d[0]*e[1]-d[1]*e[0]
 if abs(det)<1e-9:continue
 dx=xx-uv[0,0];dy=yy-uv[0,1];u=(dx*e[1]-dy*e[0])/det;v=(d[0]*dy-d[1]*dx)/det;inside=(u>=-.001)&(v>=-.001)&(u+v<=1.001);covered[yy[inside],xx[inside]]=True
 if not k:continue
 pos=p[0]+u[...,None]*(p[1]-p[0])+v[...,None]*(p[2]-p[0]);x,y,z=np.moveaxis(pos,-1,0);old=src[yy,xx,:3]
 if k in (1,2):
  r,ring,rays=solar(pos,k);color=np.ones((*x.shape,3))*[.57,.355,.31];disc=1-smooth(.95,1.08,r)
  color=color*(1-disc[...,None])+np.array([.59,.22,.135])*disc[...,None];color=color*(1-ring[...,None])+np.array([.78,.34,.18])*ring[...,None]
  core=1-smooth(.12,.23,r);color=color*(1-core[...,None])+np.array([.80,.40,.23])*core[...,None]
  color=color*(1-rays[...,None])+np.array([.81,.70,.56])*rays[...,None];strength=np.ones(x.shape)
 elif k==3:
  # Trace the existing red field and its irregular cream lower zigzag.
  points=np.array([world(q) for q in [(608,739),(628,763),(649,746),(669,790),(687,751),(703,788),(722,745),(745,763),(771,731)]])
  boundary=np.interp(x,points[:,0],points[:,1]);red=smooth(boundary-.001,boundary+.001,y)
  color=np.array([.82,.71,.54])*(1-red[...,None])+np.array([.67,.225,.13])*red[...,None]
  r,ring,rays=solar(pos,3);symbol=np.maximum(ring,rays);color=color*(1-symbol[...,None])+np.array([.86,.77,.60])*symbol[...,None]
  # Retain the original very edge of the painted panel, not its diffuse centre.
  strength=smooth(-.725,-.721,x)*(1-smooth(-.679,-.674,x))*smooth(-.137,-.132,y)*(1-smooth(-.047,-.044,y))
 elif k in (4,5,9,10):
  horizontal=k in (5,10);across=(y if k==5 else z) if horizontal else x;along=x if horizontal else y
  spacing=.024 if k in (4,5) else .017;f=np.mod((across+.78)/spacing,1)
  seam=(1-smooth(.015,.08,np.minimum(f,1-f)))*(.13 if k in (4,5) else .07)
  grain=.045*np.exp(-((f-.25-.025*np.sin(along*73))/.035)**2)+.03*np.exp(-((f-.69-.02*np.sin(along*55+1))/.035)**2)
  pigment=np.array([.44,.255,.13]) if k in (4,5) else np.array([.43,.26,.135]);color=pigment*(1-seam-grain)[...,None]*.9+old*.1;strength=np.ones(x.shape)*.94
  if k in (4,5):
   field=np.zeros(x.shape)
   for route in [[(570,845),(557,700),(555,580),(550,495),(570,410),(611,318),(657,243)],[(803,845),(801,700),(803,580),(804,495),(780,411),(726,320),(657,243)]]:
    points=np.array([world(q) for q in route]);distance=np.full(x.shape,1.)
    for start,end in zip(points,points[1:]):
     vector=end-start;f=np.clip(np.sum((pos[...,:2]-start)*vector,-1)/np.dot(vector,vector),0,1);distance=np.minimum(distance,np.linalg.norm(pos[...,:2]-start-f[...,None]*vector,axis=-1))
    field=np.maximum(field,1-smooth(.0055,.0070,distance))
   bar=smooth(world((480,0))[0],world((491,0))[0],x)*(1-smooth(world((850,0))[0],world((861,0))[0],x))*smooth(world((0,511))[1],world((0,503))[1],y)*(1-smooth(world((0,456))[1],world((0,448))[1],y))
   triangle=np.array([world(q) for q in [(657,268),(566,452),(762,452)]]);d=triangle[1]-triangle[0];e=triangle[2]-triangle[0];det=d[0]*e[1]-d[1]*e[0];dx=x-triangle[0,0];dy=y-triangle[0,1];u=(dx*e[1]-dy*e[0])/det;v=(d[0]*dy-d[1]*dx)/det
   gable=smooth(-.01,.02,np.minimum(np.minimum(u,v),1-u-v));strength*=np.maximum(field,np.maximum(bar,gable))
 elif k==6:
  color=np.array([.84,.295,.068])*(1+.025*np.cos((x+.70)*22))[...,None]*.9+old*.1;strength=smooth(-.054,-.050,y)*.92
 else:
  # Existing alternating triangular friezes, traced from rectified source paint.
  isleft=p[:,0].mean()<-.72
  points=([(61,806),(121,833),(167,805),(225,838),(277,808),(323,829)] if isleft else [(889,806),(945,837),(999,809),(1056,843),(1118,808)]) if k==7 else ([(133,802),(180,829),(226,804),(273,841),(323,808),(369,842),(406,805)] if isleft else [(960,804),(1008,835),(1060,807),(1114,844),(1163,808),(1199,835)])
  points=np.array([world(q) for q in points]);boundary=np.interp(x,points[:,0],points[:,1]);cream=smooth(boundary-.0008,boundary+.0008,y)
  color=np.array([.59,.245,.16])*(1-cream[...,None])+np.array([.83,.73,.57])*cream[...,None]
  strength=smooth(-.139,-.135,y)*(1-smooth(-.121,-.1185,y))
 pixels[yy[inside],xx[inside],:3]=(old*(1-strength[...,None])+color*strength[...,None])[inside]
for _ in range(3):
 sums=np.zeros_like(pixels);counts=np.zeros(covered.shape)
 for axis,step in [(0,-1),(0,1),(1,-1),(1,1)]:
  valid=np.roll(covered,step,axis);sums+=np.roll(pixels,step,axis)*valid[...,None];counts+=valid
 fresh=(~covered)&(counts>0);pixels[fresh]=sums[fresh]/counts[fresh,None];covered|=fresh
paint=bpy.data.images.new('Workshop rear motifs and porch details',width=2048,height=2048,alpha=True);paint.pixels.foreach_set(pixels[::-1].copy().ravel());paint.filepath_raw=str(O/'mapu-0-color-details.png');paint.file_format='PNG';paint.save();paint.pack()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('Unchanged E geometry and UV');mesh.from_pydata(a[:,:3].tolist(),[],t.tolist());mesh.update();mesh.normals_split_custom_set_from_vertices(a[:,3:6].tolist());obj=bpy.data.objects.new('Workshop rear and porch selections',mesh);bpy.context.collection.objects.link(obj);uv=mesh.uv_layers.new(name='Exact E UV')
for loop in mesh.loops:uv.data[loop.index].uv=(a[loop.vertex_index,6],1-a[loop.vertex_index,7])
for name in names:
 mat=bpy.data.materials.new(name);mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=paint;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mesh.materials.append(mat)
for face,k in zip(mesh.polygons,kinds):face.material_index=k;face.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(O/'workshop-details.blend'))
(O/'detail-audit.json').write_text(json.dumps({'size':[2048,2048],'geometryAndUv':'Exact E binary, no new geometry download','motifLandmarks':landmarks,'faceSelections':selection},indent=2)+'\n',newline='\n');print({k:len(v) for k,v in selection.items()})
