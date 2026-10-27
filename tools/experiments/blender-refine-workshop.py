"""Continuous workshop charts and traced facade restoration; Blender headless.

Run AFTER blender-paint-mapu-workshop.py. Positions/normals/triangles are copied
exactly. Only UVs and attribute seam duplicates change in the new C binary.
"""
from pathlib import Path
import json, hashlib
import bpy
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/qa/global-visual-lab/workshop-art'
ASSETS=ROOT/'public/assets/visual-lab'
raw=np.fromfile(ASSETS/'mapu-0-repacked.bin',dtype='<f4',count=10147*8).reshape(-1,8)
tri=np.fromfile(ASSETS/'mapu-0-repacked.bin',dtype='<u4',offset=10147*32).reshape(-1,3)
audit=json.loads((OUT/'art-audit.json').read_text())
srcim=bpy.data.images.load(str(OUT/'mapu-0-color-art.png'))
src=np.asarray(srcim.pixels[:],dtype=np.float32).reshape(2048,2048,4)[::-1].copy()
def smooth(a,b,x):
    q=np.clip((x-a)/(b-a),0,1);return q*q*(3-2*q)
def sample(q):
    q=np.clip(q,0,2047);lo=np.floor(q).astype(int);hi=np.minimum(lo+1,2047);f=q-lo
    return ((src[lo[...,1],lo[...,0]]*(1-f[...,0,None])+src[lo[...,1],hi[...,0]]*f[...,0,None])*(1-f[...,1,None])+
            (src[hi[...,1],lo[...,0]]*(1-f[...,0,None])+src[hi[...,1],hi[...,0]]*f[...,0,None])*f[...,1,None])
pixels=np.ones((2048,2048,4),np.float32);pixels[:,:,:3]=[.48,.22,.15]
# Keep 87.5% of the existing atlas span; reserve the right and bottom margins.
xx,yy=np.meshgrid(np.arange(1792),np.arange(1792));pixels[:1792,:1792]=sample(np.stack((xx,yy),-1)*2047/1791)
kind=np.zeros(len(tri),int);kind[audit['faceSelections']['front-arch-geometry-aligned']]=1
cent=raw[tri,:3].mean(1);norm=raw[tri,3:6].mean(1)
x,y,z=cent.T;rad=np.hypot(x+.716,y+.063)
front=(z>-.005)&(z<.075)&(norm[:,2]>.15)
kind[front&(x<-.783)&(x>-.865)&(y<-.055)&(y>-.153)]=2
kind[front&(x>-.656)&(x<-.581)&(y<-.055)&(y>-.153)]=3
facecolor=sample(raw[tri,6:8].mean(1)*2047)[:,:3]
clay=(facecolor[:,0]>.50)&(facecolor[:,1]<facecolor[:,0]*.50)&(facecolor[:,2]<facecolor[:,0]*.18)
orange=front&(x>-.852)&(x<-.582)&(y>-.057)&(rad>.055)&(rad<.14)&clay
kind[orange&(kind!=1)]=4
def chart(p,k):
    x,y,z=np.moveaxis(p,-1,0);theta=np.arctan2(x+.716,y+.063)
    if k==1:return np.stack((1812+(z-.085*(x+.716)+.015)/.05*216,24+(theta+1.85)/3.7*1736),-1)
    if k in (2,3):
        left=-.87 if k==2 else -.665;start=16 if k==2 else 376
        return np.stack((start+(x-left)/.095*336,1812+(-.05-y)/.11*216),-1)
    if k==4:return np.stack((752+(theta+1.85)/3.7*1020,1812+(np.hypot(x+.716,y+.063)-.04)/.11*216),-1)
    raise ValueError(k)

# Paint the entire continuous arch strip, including margins, with no island mask.
xx,yy=np.meshgrid(np.arange(1800,2048),np.arange(0,1792))
angle=(yy-24)/1736*3.7-1.85;axial=(xx-1812)/216*.05-.015
q=np.stack((angle*.12,axial),-1);white=np.zeros(xx.shape)
edges=json.loads((OUT/'arch-paint-edges.json').read_text())
for edge in edges:
    p=np.array(edge['ends']);ends=np.c_[np.arctan2(p[:,0]+.716,p[:,1]+.063)*.12,p[:,2]-.085*(p[:,0]+.716)]
    d=ends[1]-ends[0];t=np.clip(np.sum((q-ends[0])*d,-1)/np.dot(d,d),0,1)
    distance=np.linalg.norm(q-ends[0]-t[...,None]*d,axis=-1)
    width=.0012 if edge['role']=='border' else .00145
    white=np.maximum(white,1-smooth(width-.00025,width+.00025,distance))
pixels[yy,xx,:3]=np.array([.57,.265,.20])*(1-white[...,None])+np.array([.80,.735,.63])*white[...,None]

# Original source motif landmarks, traced on front-source-rectified.png.
# Eight existing light rays around each terracotta ring; no new emblem.
landmarks={2:((190,696),[(140,646),(177,620),(231,646),(245,693),(237,736),(191,749),(144,737),(121,696)]),
           3:((950,698),[(910,653),(941,637),(988,659),(1012,695),(999,741),(956,751),(911,733),(889,695)])}
def screen_world(p):return np.array([p[0]/1199*.30-.87,.085-p[1]/999*.255])
def facade_paint(p,source,k):
    x,y,z=np.moveaxis(p,-1,0)
    if k==4:
        r=np.hypot(x+.716,y+.063);angle=np.arctan2(x+.716,y+.063)
        # Quiet clay pigment: two broad curved application passes, no grain.
        wash=1+.045*np.exp(-((r-.117)/.010)**2)-.035*np.exp(-((r-.093)/.006)**2)
        wash+=.012*np.cos(angle*2.1+.35)
        return np.clip(np.array([.84,.295,.068])*wash[...,None]*.82+source[...,:3]*.18,0,1)
    center,points=landmarks[k];center=screen_world(center);pos=p[...,:2]
    d=pos-center;angle=np.arctan2(d[...,1],d[...,0])
    r=np.sqrt((d[...,0]/.0108)**2+(d[...,1]/.0115)**2)
    # Preserve the slightly uneven, hand-painted ring rather than a perfect icon.
    r/=1+.045*np.sin(angle*3+.4)+.025*np.cos(angle*5-.3)
    region=1-smooth(.024,.028,np.linalg.norm(d,axis=-1))
    # Remove the diffuse old marks only inside the traced medallion field.
    stone=source[...,:3]*.18+np.array([.57,.355,.31])*.82
    paint=source[...,:3]*(1-region[...,None])+stone*region[...,None]
    ray=np.zeros(x.shape)
    for rayindex,point in enumerate(points):
        end=screen_world(point);vector=end-center
        start=center+vector*.78;end=center+vector*1.07;v=end-start
        f=np.clip(np.sum((pos-start)*v,-1)/np.dot(v,v),0,1)
        dist=np.linalg.norm(pos-start-f[...,None]*v,axis=-1)
        width=[.0012,.0010,.00135,.00115,.00125,.0011,.0013,.00105][rayindex]
        ray=np.maximum(ray,1-smooth(width-.0003,width+.0004,dist))
    paint=paint*(1-ray[...,None])+np.array([.81,.70,.56])*ray[...,None]
    disc=1-smooth(.92,1.08,r);ring=(1-smooth(.92,1.08,r))*smooth(.48,.60,r)
    paint=paint*(1-disc[...,None])+np.array([.59,.22,.135])*disc[...,None]
    ringcolor=np.array([.78,.34,.18])*(.97+.035*np.clip(d[...,1]/.0115,-1,1))[...,None]
    paint=paint*(1-ring[...,None])+ringcolor*ring[...,None]
    core=1-smooth(.13,.23,r);paint=paint*(1-core[...,None])+np.array([.80,.40,.23])*core[...,None]
    return paint

new=[];indices=[];lookup={};covered=np.zeros((2048,2048),bool)
for face,ids in enumerate(tri):
    k=int(kind[face]);world=raw[ids,:3];uv=chart(world,k) if k else raw[ids,6:8]*1791
    outids=[]
    for old,uvp in zip(ids,uv):
        key=(int(old),k)
        if key not in lookup:
            v=raw[old].copy();v[6:8]=uvp/2047;lookup[key]=len(new);new.append(v)
        outids.append(lookup[key])
    indices.append(outids)
    if k not in (2,3,4):continue
    lo=np.maximum(np.floor(uv.min(0)).astype(int),0);hi=np.minimum(np.ceil(uv.max(0)).astype(int),2047)
    xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1))
    a=uv[1]-uv[0];b=uv[2]-uv[0];det=a[0]*b[1]-a[1]*b[0]
    if abs(det)<1e-8:continue
    dx=xx-uv[0,0];dy=yy-uv[0,1];u=(dx*b[1]-dy*b[0])/det;v=(a[0]*dy-a[1]*dx)/det
    inside=(u>=-.001)&(v>=-.001)&(u+v<=1.001)
    pos=world[0]+u[...,None]*(world[1]-world[0])+v[...,None]*(world[2]-world[0])
    olduv=raw[ids,6:8]*2047;q=olduv[0]+u[...,None]*(olduv[1]-olduv[0])+v[...,None]*(olduv[2]-olduv[0])
    color=facade_paint(pos,sample(q),k)
    pixels[yy[inside],xx[inside],:3]=color[inside];covered[yy[inside],xx[inside]]=True
# Fill 8px margins around facade islands only; leave the continuous band intact.
for _ in range(8):
    sums=np.zeros_like(pixels);counts=np.zeros(covered.shape)
    for axis,step in [(0,-1),(0,1),(1,-1),(1,1)]:
        valid=np.roll(covered,step,axis);sums+=np.roll(pixels,step,axis)*valid[...,None];counts+=valid
    fresh=(~covered)&(counts>0);fresh[:1799]=False
    pixels[fresh]=sums[fresh]/counts[fresh,None];covered|=fresh
new=np.asarray(new,dtype='<f4');indices=np.asarray(indices,dtype='<u4')
assert np.array_equal(new[indices,:6],raw[tri,:6])
assert len(indices)==len(tri)
assert np.all((new[:,6:8]>=0)&(new[:,6:8]<=1))
(ASSETS/'mapu-0-art.bin').write_bytes(new.tobytes()+indices.tobytes())
im=bpy.data.images.new('Workshop C continuous charts',width=2048,height=2048,alpha=True)
im.pixels.foreach_set(pixels[::-1].copy().ravel());im.filepath_raw=str(OUT/'mapu-0-color-refined.png');im.file_format='PNG';im.save();im.pack()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mesh=bpy.data.meshes.new('Workshop unchanged surfaces continuous UV');mesh.from_pydata(new[:,:3].tolist(),[],indices.tolist());mesh.update();mesh.normals_split_custom_set_from_vertices(new[:,3:6].tolist())
obj=bpy.data.objects.new('Workshop C refined',mesh);bpy.context.collection.objects.link(obj);uv=mesh.uv_layers.new(name='Continuous arch and facade')
for loop in mesh.loops:uv.data[loop.index].uv=(new[loop.vertex_index,6],1-new[loop.vertex_index,7])
for name in ['Preserved first-pass materials','Continuous arch relief','Left original sun restored','Right original sun restored','Quiet orange clay']:
    mat=bpy.data.materials.new(name);mat.use_nodes=True;node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);mesh.materials.append(mat)
for face,k in zip(mesh.polygons,kind):face.material_index=int(k);face.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'workshop-refined.blend'))
report={'vertices':len(new),'triangles':len(indices),'positionNormalExactPerCorner':True,'size':[2048,2048],'sourceHashes':audit['sourceHashes'],'faceSelections':{str(k):np.where(kind==k)[0].tolist() for k in range(5)},'baseAtlasSpan':1792,'archChart':'angle / oblique axial; continuous full strip','sunLandmarks':landmarks,'binaryBytes':(ASSETS/'mapu-0-art.bin').stat().st_size}
(OUT/'refinement-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n')
assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in audit['sourceHashes'].items())
print('Refined vertices',len(new),'triangles',len(indices),'faces',np.bincount(kind).tolist())
