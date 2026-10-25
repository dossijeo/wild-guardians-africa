"""Inspect/unwrap the actual arch relief as a connected surface, no geometry changes."""
from pathlib import Path
import bpy,numpy as np,json
R=Path(__file__).resolve().parents[2];O=R/'docs/qa/global-visual-lab/workshop-finish'
f=R/'public/assets/visual-lab/mapu-0-art.bin';n=(f.stat().st_size-7992*12)//32
a=np.fromfile(f,dtype='<f4',count=n*8).reshape(-1,8);t=np.fromfile(f,dtype='<u4',offset=n*32).reshape(-1,3)
faces=np.array(json.loads((R/'docs/qa/global-visual-lab/workshop-art/refinement-audit.json').read_text())['faceSelections']['1'])
p=a[t[faces],:3].reshape(-1,3);_,first,ids=np.unique(np.round(p,6),axis=0,return_index=True,return_inverse=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
m=bpy.data.meshes.new('Measured relief arch');m.from_pydata(p[first].tolist(),[],ids.reshape(-1,3).tolist());m.update()
o=bpy.data.objects.new('Arch relief unwrap',m);bpy.context.collection.objects.link(o);o.select_set(True);bpy.context.view_layer.objects.active=o
layer=m.uv_layers.new(name='Relief surface unwrap')
# Initialize with the cylindrical chart; Blender must unfold radial faces too.
uv=a[t[faces],6:8].copy();layer.data.foreach_set('uv',uv.ravel())
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.unwrap(method='ANGLE_BASED',fill_holes=False,correct_aspect=False,margin=.005)
bpy.ops.object.mode_set(mode='OBJECT')
mapped=np.empty(len(m.loops)*2,np.float32);layer.data.foreach_get('uv',mapped);mapped=mapped.reshape(-1,3,2)
np.savez_compressed(O/'arch-unwrapped.npz',faces=faces,uv=mapped)
area=np.abs(np.cross(mapped[:,1]-mapped[:,0],mapped[:,2]-mapped[:,0]))*.5
print('Vertices/faces',len(first),len(faces),'UV extent',mapped.min((0,1)),mapped.max((0,1)),'degenerate',int((area<1e-10).sum()))
# The resulting natural strip is 0.127 x 1: it fits the dedicated C margin.
mapped=(mapped-mapped.min((0,1)))/(mapped.max((0,1))-mapped.min((0,1)))
mapped=mapped*np.array([216,1736])+np.array([1812,24])
source=bpy.data.images.load(str(O/'mapu-0-color-finish.png'))
pixels=np.asarray(source.pixels[:],np.float32).reshape(2048,2048,4)[::-1].copy()
pixels[:1792,1800:,:3]=[.57,.265,.20]
# Supersample the strip; distance is evaluated ON each existing mesh triangle,
# not in the cylindrical projection which collapsed radial relief faces.
scale=2;strip=np.ones((1792*scale,248*scale,4),np.float32);strip[:,:,:3]=[.57,.265,.20]
covered=np.zeros(strip.shape[:2],bool)
edges=np.asarray([e['ends'] for e in json.loads((O/'arch-traced-edges.json').read_text())['edges']])
for face,uvp in zip(faces,mapped):
 world=a[t[face],:3];uv=(uvp-np.array([1800,0]))*scale
 lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),[248*scale-1,1792*scale-1])
 xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));d=uv[1]-uv[0];e=uv[2]-uv[0];det=d[0]*e[1]-d[1]*e[0]
 dx=xx+.5-uv[0,0];dy=yy+.5-uv[0,1];u=(dx*e[1]-dy*e[0])/det;v=(d[0]*dy-d[1]*dx)/det
 inside=(u>=0)&(v>=0)&(u+v<=1);pos=world[0]+u[...,None]*(world[1]-world[0])+v[...,None]*(world[2]-world[0])
 distance=np.full(xx.shape,1.)
 for start,end in edges:
  vector=end-start;f=np.clip(np.sum((pos-start)*vector,-1)/np.dot(vector,vector),0,1)
  distance=np.minimum(distance,np.linalg.norm(pos-start-f[...,None]*vector,axis=-1))
 q=np.clip((distance-.00078)/.00024,0,1);white=1-q*q*(3-2*q)
 color=np.array([.57,.265,.20])*(1-white[...,None])+np.array([.75,.675,.55])*white[...,None]
 strip[yy[inside],xx[inside],:3]=color[inside];covered[yy[inside],xx[inside]]=True
for _ in range(6):
 sums=np.zeros_like(strip);counts=np.zeros(covered.shape)
 for axis,step in [(0,-1),(0,1),(1,-1),(1,1)]:
  valid=np.roll(covered,step,axis);sums+=np.roll(strip,step,axis)*valid[...,None];counts+=valid
 fresh=(~covered)&(counts>0);strip[fresh]=sums[fresh]/counts[fresh,None];covered|=fresh
pixels[:1792,1800:]=strip.reshape(1792,scale,248,scale,4).mean((1,3))
new=[];outindices=[];lookup={};facemap={int(f):uv for f,uv in zip(faces,mapped)}
for face,ids in enumerate(t):
 uv=facemap.get(face,a[ids,6:8]*2047);outids=[]
 for old,coord in zip(ids,uv):
  key=(int(old),*np.round(coord,5))
  if key not in lookup:
   value=a[old].copy()
   if face in facemap:value[6:8]=coord/2047
   lookup[key]=len(new);new.append(value)
  outids.append(lookup[key])
 outindices.append(outids)
new=np.asarray(new,dtype='<f4');outindices=np.asarray(outindices,dtype='<u4')
assert np.array_equal(new[outindices,:6],a[t,:6])
(R/'public/assets/visual-lab/mapu-0-finish.bin').write_bytes(new.tobytes()+outindices.tobytes())
paint=bpy.data.images.new('Arch measured on unfolded relief',width=2048,height=2048,alpha=True)
paint.pixels.foreach_set(pixels[::-1].copy().ravel());paint.filepath_raw=str(O/'mapu-0-color-unwrapped.png');paint.file_format='PNG';paint.save();paint.pack()
(O/'arch-unwrap-audit.json').write_text(json.dumps({'vertices':len(new),'triangles':len(t),'positionNormalExactPerCorner':True,'archFaces':len(faces),'degenerateUvTriangles':int((area<1e-10).sum()),'paint':'3D distance to existing measured crease edges; 2x strip supersampling','lineWidthWorldMetres':.0288},indent=2)+'\n',newline='\n')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('Final workshop preserved geometry');mesh.from_pydata(new[:,:3].tolist(),[],outindices.tolist());mesh.update();mesh.normals_split_custom_set_from_vertices(new[:,3:6].tolist())
obj=bpy.data.objects.new('Workshop relief surface paint',mesh);bpy.context.collection.objects.link(obj);uv=mesh.uv_layers.new(name='Unfolded relief and preserved C charts')
for loop in mesh.loops:uv.data[loop.index].uv=(new[loop.vertex_index,6],1-new[loop.vertex_index,7])
for name in ['Preserved workshop paint','Unfolded painted relief']:
 mat=bpy.data.materials.new(name);mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=paint;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mesh.materials.append(mat)
for face in mesh.polygons:face.material_index=int(face.index in facemap);face.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(O/'arch-unwrap.blend'))
