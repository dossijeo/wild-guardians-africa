"""H ceramic study: selected ochre vessels, kiln wash and restrained rim wear."""
from pathlib import Path
import bpy,numpy as np,json
R=Path(__file__).resolve().parents[2];O=R/'docs/qa/global-visual-lab/workshop-ceramics';O.mkdir(parents=True,exist_ok=True)
path=R/'public/assets/visual-lab/mapu-0-surface.bin';n=(path.stat().st_size-7992*12)//32
a=np.fromfile(path,dtype='<f4',count=n*8).reshape(-1,8);t=np.fromfile(path,dtype='<u4',offset=n*32).reshape(-1,3)
image=bpy.data.images.load(str(R/'docs/qa/global-visual-lab/workshop-details/mapu-0-color-details.png'))
src=np.array(image.pixels[:],np.float32).reshape(2048,2048,4)[::-1].copy();pixels=src.copy()
prior=json.loads((R/'docs/qa/global-visual-lab/workshop-surfaces/surface-audit.json').read_text())['faceSelections'];cloth=set(prior['cloth-top']+prior['cloth-hem'])
pots=json.loads((R/'docs/qa/global-visual-lab/workshop-shared/accessory-audit.json').read_text())['faceSelections'];pots=set(pots['left-pot']+pots['right-pot'])
names=['protected','left-ceramic','right-ceramic'];selection={n:[] for n in names};kinds=[];covered=np.zeros((2048,2048),bool)
potgroups=json.loads((R/'docs/qa/global-visual-lab/workshop-shared/accessory-audit.json').read_text())['faceSelections']
left=set(potgroups['left-pot']);right=set(potgroups['right-pot'])
def smooth(a,b,x):
 q=np.clip((x-a)/(b-a),0,1);return q*q*(3-2*q)
for face,ids in enumerate(t):
 p=a[ids,:3];x,y,z=p.mean(0);normal=a[ids,3:6].mean(0);uv=a[ids,6:8]*2047;cu=np.clip(uv.mean(0).astype(int),0,2047);c=src[cu[1],cu[0],:3];ratio=c[1]/max(c[0],.001)
 k=1 if face in left else 2 if face in right else 0
 kinds.append(k);selection[names[k]].append(face)
 lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),2047);xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));d=uv[1]-uv[0];e=uv[2]-uv[0];det=d[0]*e[1]-d[1]*e[0]
 if abs(det)<1e-9:continue
 dx=xx-uv[0,0];dy=yy-uv[0,1];u=(dx*e[1]-dy*e[0])/det;v=(d[0]*dy-d[1]*dx)/det;inside=(u>=-.001)&(v>=-.001)&(u+v<=1.001);covered[yy[inside],xx[inside]]=True
 if not k:continue
 pos=p[0]+u[...,None]*(p[1]-p[0])+v[...,None]*(p[2]-p[0]);x,y,z=np.moveaxis(pos,-1,0);old=src[yy,xx,:3]
 # Deliberately placed clay washes; no added cultural pattern or fake relief.
 centerx,centerz=(-.784,.030) if k==1 else (-.674,.058)
 angle=np.arctan2(z-centerz,x-centerx)
 kiln=.075*np.exp(-((y+.138)/.007)**2)*(.65+.35*np.cos(angle-.8))
 shoulder=.035*np.exp(-((y+.119)/.004)**2)
 paint=np.array([.57,.335,.155])*(1-kiln+shoulder)[...,None]
 # Retain low source contribution for the asymmetry of the firing colour.
 paint=paint*.90+old*.10
 # The lip already exists in geometry: just clarify its clay edge, not its silhouette.
 lip=np.exp(-((y+.1055)/.0014)**2)*.045
 paint+=lip[...,None]*np.array([1.,.72,.38])
 # Do not flatten the dark hollow or repaint the boundary at the base.
 strength=smooth(.09,.18,old.mean(-1))*smooth(-.147,-.143,y)*.92
 color=paint
 pixels[yy[inside],xx[inside],:3]=(old*(1-strength[...,None])+color*strength[...,None])[inside]
for _ in range(3):
 sums=np.zeros_like(pixels);counts=np.zeros(covered.shape)
 for axis,step in [(0,-1),(0,1),(1,-1),(1,1)]:
  valid=np.roll(covered,step,axis);sums+=np.roll(pixels,step,axis)*valid[...,None];counts+=valid
 fresh=(~covered)&(counts>0);pixels[fresh]=sums[fresh]/counts[fresh,None];covered|=fresh
paint=bpy.data.images.new('Workshop rear motifs and porch details',width=2048,height=2048,alpha=True);paint.pixels.foreach_set(pixels[::-1].copy().ravel());paint.filepath_raw=str(O/'mapu-0-color-ceramics.png');paint.file_format='PNG';paint.save();paint.pack()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('Unchanged E geometry and UV');mesh.from_pydata(a[:,:3].tolist(),[],t.tolist());mesh.update();mesh.normals_split_custom_set_from_vertices(a[:,3:6].tolist());obj=bpy.data.objects.new('Workshop rear and porch selections',mesh);bpy.context.collection.objects.link(obj);uv=mesh.uv_layers.new(name='Exact E UV')
for loop in mesh.loops:uv.data[loop.index].uv=(a[loop.vertex_index,6],1-a[loop.vertex_index,7])
for name in names:
 mat=bpy.data.materials.new(name);mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=paint;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mesh.materials.append(mat)
for face,k in zip(mesh.polygons,kinds):face.material_index=k;face.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(O/'workshop-ceramics.blend'))
(O/'detail-audit.json').write_text(json.dumps({'size':[2048,2048],'geometryAndUv':'Exact E binary, no new geometry download','faceSelections':selection},indent=2)+'\n',newline='\n');print({k:len(v) for k,v in selection.items()})
