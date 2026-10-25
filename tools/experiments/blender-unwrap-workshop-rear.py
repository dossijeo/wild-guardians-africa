"""Unfold rear relief; reserve space by compacting only the quiet orange clay chart."""
from pathlib import Path
import bpy,numpy as np,json
R=Path(__file__).resolve().parents[2];O=R/'docs/qa/global-visual-lab/workshop-surfaces'
f=R/'public/assets/visual-lab/mapu-0-finish.bin';n=(f.stat().st_size-7992*12)//32
a=np.fromfile(f,dtype='<f4',count=n*8).reshape(-1,8);t=np.fromfile(f,dtype='<u4',offset=n*32).reshape(-1,3)
faces=np.array(json.loads((O/'rear-geometry-audit.json').read_text())['faces'])
p=a[t[faces],:3].reshape(-1,3);_,first,ids=np.unique(np.round(p,6),axis=0,return_index=True,return_inverse=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
m=bpy.data.meshes.new('Measured relief arch');m.from_pydata(p[first].tolist(),[],ids.reshape(-1,3).tolist());m.update()
o=bpy.data.objects.new('Arch relief unwrap',m);bpy.context.collection.objects.link(o);o.select_set(True);bpy.context.view_layer.objects.active=o
layer=m.uv_layers.new(name='Relief surface unwrap')
# Initialize from the existing UV; unfold the radial relief faces too.
uv=a[t[faces],6:8].copy();layer.data.foreach_set('uv',uv.ravel())
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.unwrap(method='ANGLE_BASED',fill_holes=False,correct_aspect=False,margin=.005)
bpy.ops.object.mode_set(mode='OBJECT')
mapped=np.empty(len(m.loops)*2,np.float32);layer.data.foreach_get('uv',mapped);mapped=mapped.reshape(-1,3,2)
np.savez_compressed(O/'rear-unwrapped.npz',faces=faces,uv=mapped)
area=np.abs(np.cross(mapped[:,1]-mapped[:,0],mapped[:,2]-mapped[:,0]))*.5
print('Vertices/faces',len(first),len(faces),'UV extent',mapped.min((0,1)),mapped.max((0,1)),'degenerate',int((area<1e-10).sum()))
# Rotate the natural rear strip into the new bottom-right rectangle.
mapped=(mapped-mapped.min((0,1)))/(mapped.max((0,1))-mapped.min((0,1)))
mapped=mapped[:,:,::-1]*np.array([1280,144])+np.array([756,1892])
source=bpy.data.images.load(str(O/'mapu-0-color-surfaces.png'))
pixels=np.asarray(source.pixels[:],np.float32).reshape(2048,2048,4)[::-1].copy()
original=pixels.copy()
pixels[1800:,744:,:3]=[.57,.265,.20]
orange=np.array(json.loads((R/'docs/qa/global-visual-lab/workshop-art/refinement-audit.json').read_text())['faceSelections']['4'])
old=a[t[orange],6:8]*2047;omin=old.min((0,1));ospan=old.max((0,1))-omin
orangeuv=(old-omin)/ospan*np.array([1280,68])+np.array([756,1808])
orangeMask=np.zeros((2048,2048),bool)
for face,uv in zip(orange,orangeuv):
 lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),2047)
 xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));d=uv[1]-uv[0];e=uv[2]-uv[0];det=d[0]*e[1]-d[1]*e[0]
 if abs(det)<1e-9:continue
 dx=xx-uv[0,0];dy=yy-uv[0,1];u=(dx*e[1]-dy*e[0])/det;v=(d[0]*dy-d[1]*dx)/det;inside=(u>=-.001)&(v>=-.001)&(u+v<=1.001)
 srcuv=a[t[face],6:8]*2047;q=srcuv[0]+u[...,None]*(srcuv[1]-srcuv[0])+v[...,None]*(srcuv[2]-srcuv[0]);q=np.clip(q,0,2047);base=np.floor(q).astype(int);top=np.minimum(base+1,2047);frac=q-base
 color=((original[base[...,1],base[...,0]]*(1-frac[...,0,None])+original[base[...,1],top[...,0]]*frac[...,0,None])*(1-frac[...,1,None])+(original[top[...,1],base[...,0]]*(1-frac[...,0,None])+original[top[...,1],top[...,0]]*frac[...,0,None])*frac[...,1,None])
 pixels[yy[inside],xx[inside]]=color[inside];orangeMask[yy[inside],xx[inside]]=True
# Pad actual triangle boundaries, including the concave chart silhouette.
for _ in range(8):
 sums=np.zeros_like(pixels);counts=np.zeros(orangeMask.shape)
 for axis,step in [(0,-1),(0,1),(1,-1),(1,1)]:
  valid=np.roll(orangeMask,step,axis);sums+=np.roll(pixels,step,axis)*valid[...,None];counts+=valid
 fresh=(~orangeMask)&(counts>0);fresh[:1800]=False;fresh[1884:]=False;fresh[:,:744]=False
 pixels[fresh]=sums[fresh]/counts[fresh,None];orangeMask|=fresh
# Supersample the strip; distance is evaluated ON each existing mesh triangle,
# not in the cylindrical projection which collapsed radial relief faces.
scale=2;strip=np.ones((164*scale,1300*scale,4),np.float32);strip[:,:,:3]=[.57,.265,.20]
covered=np.zeros(strip.shape[:2],bool)
edges=np.asarray([e['ends'] for e in json.loads((O/'rear-traced-edges.json').read_text())['edges']])
for face,uvp in zip(faces,mapped):
 world=a[t[face],:3];uv=(uvp-np.array([748,1884]))*scale
 lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),[1300*scale-1,164*scale-1])
 xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));d=uv[1]-uv[0];e=uv[2]-uv[0];det=d[0]*e[1]-d[1]*e[0]
 dx=xx+.5-uv[0,0];dy=yy+.5-uv[0,1];u=(dx*e[1]-dy*e[0])/det;v=(d[0]*dy-d[1]*dx)/det
 inside=(u>=0)&(v>=0)&(u+v<=1);pos=world[0]+u[...,None]*(world[1]-world[0])+v[...,None]*(world[2]-world[0])
 distance=np.full(xx.shape,1.)
 for start,end in edges:
  vector=end-start;f=np.clip(np.sum((pos-start)*vector,-1)/np.dot(vector,vector),0,1)
  distance=np.minimum(distance,np.linalg.norm(pos-start-f[...,None]*vector,axis=-1))
 q=np.clip((distance-.00078)/.00024,0,1);white=1-q*q*(3-2*q)
 color=np.array([.57,.265,.20])*(1-white[...,None])+np.array([.75,.675,.55])*white[...,None]
 # Preserve roof pigment beyond the physical rear trim, even on large faces
 # whose centroid belongs to the band but whose surface extends into the roof.
 axial=pos[...,2]-.085*(pos[...,0]+.716)+.28
 fade=np.clip((axial+.022)/.005,0,1)*np.clip((.024-axial)/.006,0,1)
 olduv=a[t[face],6:8]*2047;sample=olduv[0]+u[...,None]*(olduv[1]-olduv[0])+v[...,None]*(olduv[2]-olduv[0]);sample=np.clip(sample,0,2047)
 lo=np.floor(sample).astype(int);hi=np.minimum(lo+1,2047);f=sample-lo
 prior=((original[lo[...,1],lo[...,0],:3]*(1-f[...,0,None])+original[lo[...,1],hi[...,0],:3]*f[...,0,None])*(1-f[...,1,None])+(original[hi[...,1],lo[...,0],:3]*(1-f[...,0,None])+original[hi[...,1],hi[...,0],:3]*f[...,0,None])*f[...,1,None])
 color=color*fade[...,None]+prior*(1-fade[...,None])
 strip[yy[inside],xx[inside],:3]=color[inside];covered[yy[inside],xx[inside]]=True
for _ in range(6):
 sums=np.zeros_like(strip);counts=np.zeros(covered.shape)
 for axis,step in [(0,-1),(0,1),(1,-1),(1,1)]:
  valid=np.roll(covered,step,axis);sums+=np.roll(strip,step,axis)*valid[...,None];counts+=valid
 fresh=(~covered)&(counts>0);strip[fresh]=sums[fresh]/counts[fresh,None];covered|=fresh
pixels[1884:,748:]=strip.reshape(164,scale,1300,scale,4).mean((1,3))
new=[];outindices=[];lookup={};facemap={int(f):uv for f,uv in zip(faces,mapped)};facemap.update({int(f):uv for f,uv in zip(orange,orangeuv)})
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
(R/'public/assets/visual-lab/mapu-0-surface.bin').write_bytes(new.tobytes()+outindices.tobytes())
paint=bpy.data.images.new('Arch measured on unfolded relief',width=2048,height=2048,alpha=True)
paint.pixels.foreach_set(pixels[::-1].copy().ravel());paint.filepath_raw=str(O/'mapu-0-color-rear.png');paint.file_format='PNG';paint.save();paint.pack()
(O/'rear-unwrap-audit.json').write_text(json.dumps({'vertices':len(new),'triangles':len(t),'positionNormalExactPerCorner':True,'rearFaces':len(faces),'relocatedOrangeFaces':orange.tolist(),'changedUvFaces':sorted(facemap),'degenerateUvTriangles':int((area<1e-10).sum()),'paint':'3D distance to existing measured crease edges; 2x strip supersampling','lineWidthWorldMetres':.0288},indent=2)+'\n',newline='\n')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('Final workshop preserved geometry');mesh.from_pydata(new[:,:3].tolist(),[],outindices.tolist());mesh.update();mesh.normals_split_custom_set_from_vertices(new[:,3:6].tolist())
obj=bpy.data.objects.new('Workshop relief surface paint',mesh);bpy.context.collection.objects.link(obj);uv=mesh.uv_layers.new(name='Unfolded relief and preserved C charts')
for loop in mesh.loops:uv.data[loop.index].uv=(new[loop.vertex_index,6],1-new[loop.vertex_index,7])
for name in ['Preserved workshop paint','Unfolded painted relief']:
 mat=bpy.data.materials.new(name);mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=paint;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mesh.materials.append(mat)
for face in mesh.polygons:face.material_index=int(face.index in facemap);face.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(O/'rear-unwrap.blend'))
