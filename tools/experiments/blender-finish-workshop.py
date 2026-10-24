"""Selected timber and measured arch paint on the exclusive C atlas, 2048 squared."""
from pathlib import Path
import bpy, numpy as np, json
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/qa/global-visual-lab/workshop-finish';OUT.mkdir(parents=True,exist_ok=True)
path=ROOT/'public/assets/visual-lab/mapu-0-art.bin';n=(path.stat().st_size-7992*12)//32
a=np.fromfile(path,dtype='<f4',count=n*8).reshape(-1,8);t=np.fromfile(path,dtype='<u4',offset=n*32).reshape(-1,3)
im=bpy.data.images.load(str(ROOT/'docs/qa/global-visual-lab/workshop-shared/mapu-0-color-accessories.png'))
pixels=np.array(im.pixels[:],dtype=np.float32).reshape(2048,2048,4)[::-1].copy()
src=pixels.copy()
def smooth(a,b,x):
 q=np.clip((x-a)/(b-a),0,1);return q*q*(3-2*q)
# Use the same measured crease endpoints and continuous UV strip as C.
# Uniform 0.0288m full width, warmed pigment, no enlarged intersections.
xx,yy=np.meshgrid(np.arange(1800,2048),np.arange(1792))
q=np.stack((((yy-24)/1736*3.7-1.85)*.12,(xx-1812)/216*.05-.015),-1)
white=np.zeros(xx.shape)
for edge in json.loads((ROOT/'docs/qa/global-visual-lab/workshop-art/arch-paint-edges.json').read_text()):
 p=np.array(edge['ends']);ends=np.c_[np.arctan2(p[:,0]+.716,p[:,1]+.063)*.12,p[:,2]-.085*(p[:,0]+.716)]
 d=ends[1]-ends[0];f=np.clip(np.sum((q-ends[0])*d,-1)/np.dot(d,d),0,1)
 distance=np.linalg.norm(q-ends[0]-f[...,None]*d,axis=-1)
 white=np.maximum(white,1-smooth(.00072,.00108,distance))
pixels[yy,xx,:3]=np.array([.57,.265,.20])*(1-white[...,None])+np.array([.75,.675,.55])*white[...,None]
selections={'preserved':[],'gable-timber':[],'porch-posts':[]};kinds=[];covered=np.zeros((2048,2048),bool)
for face,ids in enumerate(t):
 p=a[ids,:3];x,y,z=p.mean(0);normal=a[ids,3:6].mean(0)
 uv=a[ids,6:8]*2047;cu=np.clip(uv.mean(0).astype(int),0,2047);c=src[cu[1],cu[0],:3]
 # Gable insert inside the curved frame; exclude the orange masonry and arch.
 gable=(-.774<x<-.663 and -.039<y<.030 and -.004<z<.025 and normal[2]>.45 and c[1]>.30*c[0] and c[1]<.82*c[0])
 # Existing upright porch poles, excluding cloth and the roof's end band.
 post=(-.981<x<-.870 and -.146<y<.035 and abs(normal[1])<.55 and (abs(z+.211)<.017 or abs(z+.058)<.017) and c[1]>.36*c[0] and c[1]<.80*c[0])
 k=1 if gable else 2 if post else 0;kinds.append(k);selections[list(selections)[k]].append(face)
 if not k:continue
 lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),2047)
 xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));d=uv[1]-uv[0];e=uv[2]-uv[0];det=d[0]*e[1]-d[1]*e[0]
 if abs(det)<1e-8:continue
 dx=xx-uv[0,0];dy=yy-uv[0,1];u=(dx*e[1]-dy*e[0])/det;v=(d[0]*dy-d[1]*dx)/det;inside=(u>=-.001)&(v>=-.001)&(u+v<=1.001)
 pos=p[0]+u[...,None]*(p[1]-p[0])+v[...,None]*(p[2]-p[0]);x,y,z=np.moveaxis(pos,-1,0)
 if k==1:
  boards=np.array([-.785,-.759,-.738,-.716,-.695,-.674,-.649]);b=np.clip(np.searchsorted(boards,x)-1,0,5);f=(x-boards[b])/(boards[b+1]-boards[b])
  joint=(1-smooth(.015,.08,np.minimum(f,1-f)))*.19
  grain=.055*np.exp(-((f-.26-.024*np.sin(y*78))/.035)**2)+.035*np.exp(-((f-.70-.02*np.sin(y*65+1))/.035)**2)
  tones=np.array([1.02,.95,1.04,.98,1.01,.96])[b]
  color=np.array([.47,.27,.135])*tones[...,None]*(1-joint-grain)[...,None]
 else:
  streak=.05*np.exp(-((x+.940+.001*np.sin(y*63))/.0014)**2)
  color=np.ones((*x.shape,3))*np.array([.40,.235,.12])*(1-streak[...,None])
 color=color*.87+src[yy,xx,:3]*.13
 pixels[yy[inside],xx[inside],:3]=color[inside];covered[yy[inside],xx[inside]]=True
# Refresh a one-pixel authored edge only; do not bleed into neighbouring islands.
for axis,step in [(0,-1),(0,1),(1,-1),(1,1)]:
 fresh=(~covered)&np.roll(covered,step,axis);pixels[fresh]=np.roll(pixels,step,axis)[fresh]
paint=bpy.data.images.new('Exclusive workshop finish',width=2048,height=2048,alpha=True)
paint.pixels.foreach_set(pixels[::-1].copy().ravel());paint.filepath_raw=str(OUT/'mapu-0-color-finish.png');paint.file_format='PNG';paint.save();paint.pack()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('Unchanged C workshop');mesh.from_pydata(a[:,:3].tolist(),[],t.tolist());mesh.update();mesh.normals_split_custom_set_from_vertices(a[:,3:6].tolist())
obj=bpy.data.objects.new('Workshop selective finish',mesh);bpy.context.collection.objects.link(obj);uv=mesh.uv_layers.new(name='Preserved continuous C charts')
for loop in mesh.loops:uv.data[loop.index].uv=(a[loop.vertex_index,6],1-a[loop.vertex_index,7])
for name in selections:
 mat=bpy.data.materials.new(name);mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=paint;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mesh.materials.append(mat)
for face,k in zip(mesh.polygons,kinds):face.material_index=k;face.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'workshop-finish.blend'))
(OUT/'finish-audit.json').write_text(json.dumps({'geometryAndUv':'Exact existing C binary; other nine units unchanged','size':[2048,2048],'archLineWidthWorldMetres':.0288,'faceSelections':selections},indent=2)+'\n',newline='\n')
print({k:len(v) for k,v in selections.items()})
