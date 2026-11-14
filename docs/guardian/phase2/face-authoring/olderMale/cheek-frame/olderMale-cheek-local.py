"""REJECTED UV-masked normal frequency study; loses relief without fixing seams."""
import bpy,numpy as np,json,hashlib
from pathlib import Path
root=Path.cwd();source=root/'content/source/actors/olderMale/expressive-candidate.blend'
bpy.ops.wm.open_mainfile(filepath=str(source));o=bpy.data.objects['Mesh0.001'];m=o.data
normal=next(n for mat in o.data.materials if mat.use_nodes for n in mat.node_tree.nodes if n.type=='NORMAL_MAP')
tex=normal.inputs['Color'].links[0].from_node;image=tex.image;w,h=image.size
pixels=np.array(image.pixels[:],dtype=np.float32).reshape(h,w,4);mask=np.zeros((h,w),dtype=np.float32)
m.calc_loop_triangles();uv=m.uv_layers.active.data
for tri in m.loop_triangles:
 points=np.array([list(o.matrix_world@m.vertices[i].co) for i in tri.vertices]);c=points.mean(axis=0)
 if c[1]>-.16 or abs(c[0])>.22 or not 1.04<c[2]<1.25:continue
 coords=np.array([uv[i].uv[:] for i in tri.loops])*[w,h]-.5
 lo=np.maximum(np.floor(coords.min(axis=0)).astype(int),0);hi=np.minimum(np.ceil(coords.max(axis=0)).astype(int),[w-1,h-1])
 if np.any(hi<lo):continue
 yy,xx=np.mgrid[lo[1]:hi[1]+1,lo[0]:hi[0]+1];a,b,d=coords;den=(b[1]-d[1])*(a[0]-d[0])+(d[0]-b[0])*(a[1]-d[1])
 if abs(den)<1e-9:continue
 u=((b[1]-d[1])*(xx-d[0])+(d[0]-b[0])*(yy-d[1]))/den;v=((d[1]-a[1])*(xx-d[0])+(a[0]-d[0])*(yy-d[1]))/den;t=1-u-v
 q=u[...,None]*points[0]+v[...,None]*points[1]+t[...,None]*points[2]
 cheek=((np.abs(q[...,0])-.155)/.11)**2+((q[...,2]-1.12)/.085)**2
 nose=(q[...,0]/.075)**2+((q[...,2]-1.17)/.055)**2
 weight=np.clip((1-np.minimum(cheek,nose))*2,0,1);weight*=((u>=0)&(v>=0)&(t>=0));weight*=np.clip((np.abs(q[...,0])-.10)/.035,0,1)+(np.clip((q[...,2]-1.10)/.025,0,1))*(1-np.clip((np.abs(q[...,0])-.10)/.035,0,1))
 region=mask[lo[1]:hi[1]+1,lo[0]:hi[0]+1];np.maximum(region,weight,out=region)
def blur(a,r=12):
 for axis in [0,1]:
  pads=[(0,0)]*a.ndim;pads[axis]=(r,r);b=np.pad(a,pads,mode='edge');cs=np.cumsum(b,axis=axis,dtype=np.float64);shape=list(cs.shape);shape[axis]=1;cs=np.concatenate([np.zeros(shape),cs],axis=axis)
  high=[slice(None)]*a.ndim;low=high.copy();high[axis]=slice(2*r+1,None);low[axis]=slice(None,-(2*r+1));a=((cs[tuple(high)]-cs[tuple(low)])/(2*r+1)).astype(np.float32)
 return a
n=pixels[:,:,:3]*2-1;low=blur(blur(n));out=n.copy();out=out*(1-mask[:,:,None])+np.array([0,0,1],dtype=np.float32)*mask[:,:,None]
out/=np.maximum(np.linalg.norm(out,axis=2,keepdims=True),1e-5);result=pixels.copy();affected=mask>0;result[affected,:3]=(out[affected]+1)*.5

# Mark all occupied UV pixels so padding cannot overwrite another island.
occupied=np.zeros((h,w),dtype=bool)
for tri in m.loop_triangles:
 coords=np.array([uv[i].uv[:] for i in tri.loops])*[w,h]-.5
 lo=np.maximum(np.floor(coords.min(axis=0)).astype(int),0);hi=np.minimum(np.ceil(coords.max(axis=0)).astype(int),[w-1,h-1])
 if np.any(hi<lo):continue
 yy,xx=np.mgrid[lo[1]:hi[1]+1,lo[0]:hi[0]+1];a,b,d=coords;den=(b[1]-d[1])*(a[0]-d[0])+(d[0]-b[0])*(a[1]-d[1])
 if abs(den)<1e-9:continue
 u=((b[1]-d[1])*(xx-d[0])+(d[0]-b[0])*(yy-d[1]))/den;v=((d[1]-a[1])*(xx-d[0])+(a[0]-d[0])*(yy-d[1]))/den
 occupied[lo[1]:hi[1]+1,lo[0]:hi[0]+1]|=(u>=0)&(v>=0)&(u+v<=1)
known=affected.copy();padding=np.zeros_like(known)
for iteration in range(4):
 nextKnown=known.copy();nextResult=result.copy()
 for dy,dx in [(0,1),(0,-1),(1,0),(-1,0)]:
  neighbor=np.roll(known,(dy,dx),(0,1));take=neighbor&~occupied&~nextKnown
  if dy>0:take[:dy]=False
  if dy<0:take[dy:]=False
  if dx>0:take[:,:dx]=False
  if dx<0:take[:,dx:]=False
  nextResult[take]=np.roll(result,(dy,dx),(0,1))[take];nextKnown|=take;padding|=take
 result=nextResult;known=nextKnown
print('Padded empty UV texels:',int(padding.sum()))

new=bpy.data.images.new('olderMale-local-normal-frequency',width=w,height=h,alpha=True);new.colorspace_settings.name='Non-Color';new.pixels.foreach_set(result.ravel());new.pack();tex.image=new
bpy.ops.wm.save_as_mainfile(filepath=str(root/'test-results/olderMale-cheek-local.blend'),compress=True)
(root/'test-results/olderMale-cheek-local.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'normalImage':image.name,'maskedTexels':int(affected.sum()),'outsideMaskByteValuesUnchanged':bool(np.array_equal(result[~affected],pixels[~affected])),'geometryEdits':0,'albedoEdits':0,'status':'DIAGNOSTIC ONLY: awaiting review'},indent=2))

