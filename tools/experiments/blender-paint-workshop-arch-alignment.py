"""I: front arch paint centred on measured mesh edges at actual texture texel centres."""
from pathlib import Path
import bpy,numpy as np,json,os
R=Path(__file__).resolve().parents[2];O=R/'docs/qa/global-visual-lab/workshop-arch-alignment';O.mkdir(parents=True,exist_ok=True)
mode=os.environ.get('WG_ARCH_MODE','thin')
if mode=='bevel':O=O/'bevel';O.mkdir(parents=True,exist_ok=True)
f=R/'public/assets/visual-lab/mapu-0-surface.bin';n=(f.stat().st_size-7992*12)//32
a=np.fromfile(f,dtype='<f4',count=n*8).reshape(-1,8);t=np.fromfile(f,dtype='<u4',offset=n*32).reshape(-1,3)
faces=np.array(json.loads((R/'docs/qa/global-visual-lab/workshop-art/refinement-audit.json').read_text())['faceSelections']['1'])
# Runtime sampling uses pixel-centre coordinates (x+.5)/2048, not x/2047.
mapped=a[t[faces],6:8]*2048
source=bpy.data.images.load(str(R/'docs/qa/global-visual-lab/workshop-details/mapu-0-color-details.png'))
pixels=np.asarray(source.pixels[:],np.float32).reshape(2048,2048,4)[::-1].copy()
# Supersample the strip; distance is evaluated ON each existing mesh triangle,
# not in the cylindrical projection which collapsed radial relief faces.
scale=4;strip=np.ones((1792*scale,248*scale,4),np.float32);strip[:,:,:3]=[.57,.265,.20]
covered=np.zeros(strip.shape[:2],bool)
edges=np.asarray([e['ends'] for e in json.loads((R/'docs/qa/global-visual-lab/workshop-finish/arch-traced-edges.json').read_text())['edges']])
bevel_faces=[]
edge_data=json.loads((R/'docs/qa/global-visual-lab/workshop-finish/arch-traced-edges.json').read_text())['edges']
zigzag_keys={tuple(sorted(tuple(np.rint(np.array(v)*1e6).astype(int)) for v in e['ends'])) for e in edge_data if e['role']=='zigzag'}
for face in faces:
 p=a[t[face],:3];c=p.mean(0);normal=np.cross(p[1]-p[0],p[2]-p[0]);normal/=max(np.linalg.norm(normal),1e-12);radial=np.array([c[0]+.716,c[1]+.063,0]);radial/=np.linalg.norm(radial)
 adjacent=any(tuple(sorted([tuple(np.rint(p[j]*1e6).astype(int)),tuple(np.rint(p[(j+1)%3]*1e6).astype(int))])) in zigzag_keys for j in range(3))
 if adjacent and abs(normal@radial)<.90:bevel_faces.append(int(face))
if mode=='bevel':assert bevel_faces, 'No bevel selection'
for face,uvp in zip(faces,mapped):
 world=a[t[face],:3];uv=(uvp-np.array([1800,0]))*scale
 lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),[248*scale-1,1792*scale-1])
 xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));d=uv[1]-uv[0];e=uv[2]-uv[0];det=d[0]*e[1]-d[1]*e[0]
 dx=xx+.5-uv[0,0];dy=yy+.5-uv[0,1];u=(dx*e[1]-dy*e[0])/det;v=(d[0]*dy-d[1]*dx)/det
 inside=(u>=0)&(v>=0)&(u+v<=1);pos=world[0]+u[...,None]*(world[1]-world[0])+v[...,None]*(world[2]-world[0])
 distance=np.full(xx.shape,1.)
 # Edges outside the triangle's expanded AABB cannot contribute pigment.
 nearby=edges[np.all(edges.max(1)>=world.min(0)-.00072,axis=1)&np.all(edges.min(1)<=world.max(0)+.00072,axis=1)]
 for start,end in nearby:
  vector=end-start;f=np.clip(np.sum((pos-start)*vector,-1)/np.dot(vector,vector),0,1)
  distance=np.minimum(distance,np.linalg.norm(pos-start-f[...,None]*vector,axis=-1))
 q=np.clip((distance-.00048)/.00024,0,1);white=1-q*q*(3-2*q)
 if mode=='bevel' and face in bevel_faces:white=np.ones_like(white)
 color=np.array([.57,.265,.20])*(1-white[...,None])+np.array([.75,.675,.55])*white[...,None]
 strip[yy[inside],xx[inside],:3]=color[inside];covered[yy[inside],xx[inside]]=True
for _ in range(6):
 sums=np.zeros_like(strip);counts=np.zeros(covered.shape)
 for axis,step in [(0,-1),(0,1),(1,-1),(1,1)]:
  valid=np.roll(covered,step,axis);sums+=np.roll(strip,step,axis)*valid[...,None];counts+=valid
 fresh=(~covered)&(counts>0);strip[fresh]=sums[fresh]/counts[fresh,None];covered|=fresh
pixels[:1792,1800:]=strip.reshape(1792,scale,248,scale,4).mean((1,3))

paint=bpy.data.images.new('Front arch precise cream edge paint',width=2048,height=2048,alpha=True);paint.pixels.foreach_set(pixels[::-1].copy().ravel());paint.filepath_raw=str(O/'mapu-0-color-arch-alignment.png');paint.file_format='PNG';paint.save();paint.pack()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('Exact F geometry and UV');mesh.from_pydata(a[:,:3].tolist(),[],t.tolist());mesh.update();mesh.normals_split_custom_set_from_vertices(a[:,3:6].tolist());obj=bpy.data.objects.new('Front arch selection',mesh);bpy.context.collection.objects.link(obj);uv=mesh.uv_layers.new(name='Exact F UV')
for loop in mesh.loops:uv.data[loop.index].uv=(a[loop.vertex_index,6],1-a[loop.vertex_index,7])
for name in ['Protected F','Measured front arch']:
 mat=bpy.data.materials.new(name);mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=paint;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mesh.materials.append(mat)
for face in mesh.polygons:face.material_index=int(face.index in faces);face.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(O/'workshop-arch-alignment.blend'))
(O/'alignment-audit.json').write_text(json.dumps({'mode':mode,'bevelFaces':bevel_faces,'geometryAndUV':'exact F/E binary','atlas':[2048,2048],'archFaces':faces.tolist(),'supersampling':4,'paintHalfWidthLocal':[.00048,.00072],'paintNominalFullWidthMetres':.0192,'FNominalFullWidthMetres':.0288,'paintCentre':'existing mesh edge segments, unchanged path'},indent=2)+'\n',newline='\n')
