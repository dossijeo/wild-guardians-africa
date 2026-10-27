"""Quiet stone around protected suns and continuous cloth hem, authored in Blender."""
from pathlib import Path
import bpy,numpy as np,json
R=Path(__file__).resolve().parents[2];O=R/'docs/qa/global-visual-lab/workshop-surfaces';O.mkdir(parents=True,exist_ok=True)
path=R/'public/assets/visual-lab/mapu-0-finish.bin';n=(path.stat().st_size-7992*12)//32
a=np.fromfile(path,dtype='<f4',count=n*8).reshape(-1,8);t=np.fromfile(path,dtype='<u4',offset=n*32).reshape(-1,3)
im=bpy.data.images.load(str(R/'docs/qa/global-visual-lab/workshop-finish/mapu-0-color-unwrapped.png'))
src=np.array(im.pixels[:],np.float32).reshape(2048,2048,4)[::-1].copy();pixels=src.copy()
groups=json.loads((R/'docs/qa/global-visual-lab/workshop-art/refinement-audit.json').read_text())['faceSelections']
stone=set(groups['2']+groups['3']);cloth=set(json.loads((R/'docs/qa/global-visual-lab/workshop-shared/accessory-audit.json').read_text())['faceSelections']['woven-awning'])
# Expand only through shared physical cloth edges, not nearby wood supports.
_,weld=np.unique(np.round(a[:,:3],6),axis=0,return_inverse=True);adj={}
for f,ids in enumerate(t):
 for j in range(3):adj.setdefault(tuple(sorted([int(weld[ids[j]]),int(weld[ids[(j+1)%3]])])),[]).append(f)
hem=set()
for connected in adj.values():
 if not cloth.intersection(connected):continue
 for f in connected:
  x,y,z=a[t[f],:3].mean(0)
  uvc=np.clip((a[t[f],6:8].mean(0)*2047).astype(int),0,2047);c=src[uvc[1],uvc[0],:3];ratio=c[1]/max(c[0],.001)
  if -.97<x<-.80 and -.057<y<.016 and -.23<z<-.045 and f not in cloth and (ratio<.45 or ratio>.70):hem.add(f)
def smooth(a,b,x):
 q=np.clip((x-a)/(b-a),0,1);return q*q*(3-2*q)
selection={'protected':[],'sun-surround-stone':[],'cloth-top':[],'cloth-hem':[]};kinds=[];mask=np.zeros((2048,2048),bool)
for face,ids in enumerate(t):
 k=1 if face in stone else 2 if face in cloth else 3 if face in hem else 0;kinds.append(k);selection[list(selection)[k]].append(face)
 if not k:continue
 uv=a[ids,6:8]*2047;p=a[ids,:3];lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),2047)
 xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));d=uv[1]-uv[0];e=uv[2]-uv[0];det=d[0]*e[1]-d[1]*e[0]
 if abs(det)<1e-9:continue
 dx=xx-uv[0,0];dy=yy-uv[0,1];u=(dx*e[1]-dy*e[0])/det;v=(d[0]*dy-d[1]*dx)/det;inside=(u>=-.001)&(v>=-.001)&(u+v<=1.001)
 pos=p[0]+u[...,None]*(p[1]-p[0])+v[...,None]*(p[2]-p[0]);x,y,z=np.moveaxis(pos,-1,0);old=src[yy,xx,:3]
 if k==1:
  # Preserve the exact restored medallion and original lower zigzag frieze.
  center=np.array([190/1199*.30-.87,.085-696/999*.255]) if p[:,0].mean()<-.72 else np.array([950/1199*.30-.87,.085-698/999*.255])
  distance=np.linalg.norm(pos[...,:2]-center,axis=-1)
  strength=smooth(.013,.015,distance)
  landmarks=[(140,646),(177,620),(231,646),(245,693),(237,736),(191,749),(144,737),(121,696)] if p[:,0].mean()<-.72 else [(910,653),(941,637),(988,659),(1012,695),(999,741),(956,751),(911,733),(889,695)]
  for px,py in landmarks:
   end=np.array([px/1199*.30-.87,.085-py/999*.255]);vector=end-center;start=center+vector*.72;end=center+vector*1.12;v=end-start
   along=np.clip(np.sum((pos[...,:2]-start)*v,-1)/np.dot(v,v),0,1);distance=np.linalg.norm(pos[...,:2]-start-along[...,None]*v,axis=-1)
   strength*=smooth(.0018,.0032,distance)
  frieze=smooth(-.140,-.136,y)*(1-smooth(-.115,-.111,y));strength*=1-frieze
  # Two broad mineral washes, no arbitrary grain or invented stone joints.
  iron=.038*np.exp(-((y+.061)/.012)**2)-.025*np.exp(-((y+.110)/.010)**2)
  warm=.015*np.cos((x+.72)*30)
  color=np.array([.57,.355,.31])*(1+iron+warm)[...,None]
  # Retain a restrained broad source value, suppress diffuse speckling.
  color=color*.94+old*.06
 else:
  across=x+.0025*np.sin((z+.13)*24);cream=np.ones(x.shape)
  for j,b in enumerate([-.928,-.904,-.881,-.856,-.832]):cream+=(-1 if j%2==0 else 1)*smooth(b-.0008,b+.0008,across)
  cream=np.clip(cream,0,1)
  color=np.array([.65,.235,.14])*(1-cream[...,None])+np.array([.84,.735,.56])*cream[...,None]
  # Placed edge seams follow the two existing transverse hems.
  seam=(np.exp(-((z+.065)/.0018)**2)+np.exp(-((z+.207)/.0018)**2))*.07
  color=color*(1-seam[...,None])*.96+old*.04;strength=np.ones(x.shape)
 result=old*(1-strength[...,None])+color*strength[...,None]
 pixels[yy[inside],xx[inside],:3]=result[inside];mask[yy[inside],xx[inside]]=True
# One texel padding at changed charts, with all original mesh interiors protected.
occupied=np.zeros((2048,2048),bool)
for ids in t:
 uv=a[ids,6:8]*2047;lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),2047)
 xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));d=uv[1]-uv[0];e=uv[2]-uv[0];det=d[0]*e[1]-d[1]*e[0]
 if abs(det)<1e-9:continue
 dx=xx-uv[0,0];dy=yy-uv[0,1];u=(dx*e[1]-dy*e[0])/det;v=(d[0]*dy-d[1]*dx)/det;q=(u>=-.001)&(v>=-.001)&(u+v<=1.001);occupied[yy[q],xx[q]]=True
for axis,step in [(0,-1),(0,1),(1,-1),(1,1)]:
 fresh=(~occupied)&np.roll(mask,step,axis);pixels[fresh]=np.roll(pixels,step,axis)[fresh]
paint=bpy.data.images.new('Workshop stone and cloth paint',width=2048,height=2048,alpha=True);paint.pixels.foreach_set(pixels[::-1].copy().ravel());paint.filepath_raw=str(O/'mapu-0-color-surfaces.png');paint.file_format='PNG';paint.save();paint.pack()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('Unchanged D workshop');mesh.from_pydata(a[:,:3].tolist(),[],t.tolist());mesh.update();mesh.normals_split_custom_set_from_vertices(a[:,3:6].tolist());obj=bpy.data.objects.new('Selected stone and cloth',mesh);bpy.context.collection.objects.link(obj);uv=mesh.uv_layers.new(name='Preserved D UV')
for loop in mesh.loops:uv.data[loop.index].uv=(a[loop.vertex_index,6],1-a[loop.vertex_index,7])
for name in selection:
 mat=bpy.data.materials.new(name);mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=paint;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mesh.materials.append(mat)
for face,k in zip(mesh.polygons,kinds):face.material_index=k;face.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(O/'workshop-surfaces.blend'))
(O/'surface-audit.json').write_text(json.dumps({'size':[2048,2048],'geometryAndUv':'unchanged D','protectedSunRadius':.028,'faceSelections':selection},indent=2)+'\n',newline='\n')
print({k:len(v) for k,v in selection.items()})
