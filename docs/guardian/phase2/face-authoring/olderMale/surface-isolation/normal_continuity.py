"""Isolated triangle normal-field continuity experiment. Not a production repair."""
import io,json,struct,hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import lsqr
src=Path('public/assets/e870835e4fa3c1cc4fdbcd048a2ca64da97d2ea4f48ea3192da6aba692e05202.glb');raw=src.read_bytes()
offset=12
while offset<len(raw):
 size,kind=struct.unpack_from('<II',raw,offset);chunk=raw[offset+8:offset+8+size];offset+=8+size
 if kind==0x4e4f534a:j=json.loads(chunk)
 else:binary=chunk
def accessor(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dtype=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']]);width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
 return np.ndarray((a['count'],width),dtype,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',width*dtype.itemsize),dtype.itemsize)).copy()
p=next(p for m in j['meshes'] for p in m['primitives'] if 'normalTexture' in j['materials'][p['material']])
pos=accessor(p['attributes']['POSITION']);n=accessor(p['attributes']['NORMAL']);t=accessor(p['attributes']['TANGENT']);uv=accessor(p['attributes']['TEXCOORD_0']);tri=accessor(p['indices']).reshape(-1,3)
img=j['images'][j['textures'][j['materials'][p['material']]['normalTexture']['index']]['source']];bv=j['bufferViews'][img['bufferView']]
pixels=np.array(Image.open(io.BytesIO(binary[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGBA'));h,w=pixels.shape[:2];tex=pixels[:,:,:3]/127.5-1
def unit(v):return v/np.maximum(np.linalg.norm(v,axis=-1,keepdims=True),1e-10)
def frames(ids,bary):
 N=unit(bary@n[ids]);T=bary@t[ids,:3];T=unit(T-N*np.sum(T*N,axis=-1,keepdims=True));B=np.cross(N,T)*t[ids[0],3];return T,B,N
def sample(ids,bary):
 q=bary@uv[ids]*[w,h]-.5;ix=np.floor(q).astype(int);f=q-ix
 def at(dx,dy):return tex[np.clip(ix[:,1]+dy,0,h-1),np.clip(ix[:,0]+dx,0,w-1)]
 local=(at(0,0)*(1-f[:,0,None])+at(1,0)*f[:,0,None])*(1-f[:,1,None])+(at(0,1)*(1-f[:,0,None])+at(1,1)*f[:,0,None])*f[:,1,None]
 T,B,N=frames(ids,bary);return unit(T*local[:,0,None]+B*local[:,1,None]+N*local[:,2,None])
# GLTF coordinates are Y-up, face points toward +Z.
centers=pos[tri].mean(axis=1);selection=np.where((abs(centers[:,0])<.23)&(centers[:,1]>1.06)&(centers[:,1]<1.29)&(centers[:,2]>.16))[0];lookup={int(f):k for k,f in enumerate(selection)}
keys=[tuple(v) for v in np.round(pos*1e6).astype(int)];edges={}
for f in selection:
 ids=tri[f]
 for a,b in [(0,1),(1,2),(2,0)]:
  if keys[ids[a]]>keys[ids[b]]:a,b=b,a
  edges.setdefault((keys[ids[a]],keys[ids[b]]),[]).append((int(f),a,b))
rows=[];cols=[];values=[];rhs=[];count=0
for pair in edges.values():
 if len(pair)!=2:continue
 samples=[]
 for f,a,b in pair:
  weights=np.zeros((5,3));weights[:,a]=np.linspace(.15,.85,5)*.94;weights[:,b]=(1-np.linspace(.15,.85,5))*.94;weights[:,3-a-b]=.06
  samples.append(sample(tri[f],weights))
 delta=np.mean(samples[1]-samples[0],axis=0)
 for (f,a,b),sign in zip(pair,[1,-1]):rows.append(count);cols.append(lookup[f]);values.append(sign)
 rhs.append(delta);count+=1
edgecount=count
for f in selection:
 rows.append(count);cols.append(lookup[int(f)]);values.append(.12);rhs.append([0,0,0]);count+=1
A=coo_matrix((values,(rows,cols)),shape=(count,len(selection))).tocsr();rhs=np.array(rhs);correction=np.stack([lsqr(A,rhs[:,k],atol=1e-9,btol=1e-9)[0] for k in range(3)],axis=1)
result=pixels.copy();modified=np.zeros((h,w),bool)
for f in selection:
 ids=tri[f];coords=uv[ids]*[w,h]-.5;lo=np.maximum(np.floor(coords.min(axis=0)).astype(int),0);hi=np.minimum(np.ceil(coords.max(axis=0)).astype(int),[w-1,h-1])
 if np.any(hi<lo):continue
 yy,xx=np.mgrid[lo[1]:hi[1]+1,lo[0]:hi[0]+1];a,b,c=coords;den=np.cross(b-a,c-a)
 if abs(den)<1e-9:continue
 v=((xx-a[0])*(c[1]-a[1])-(yy-a[1])*(c[0]-a[0]))/den;z=((b[0]-a[0])*(yy-a[1])-(b[1]-a[1])*(xx-a[0]))/den;u=1-v-z;valid=(u>=0)&(v>=0)&(z>=0)
 if not np.any(valid):continue
 bary=np.stack([u[valid],v[valid],z[valid]],axis=1);q=bary@pos[ids]
 cheek=((abs(q[:,0])-.13)/.10)**2+((q[:,1]-1.135)/.075)**2;nose=(q[:,0]/.075)**2+((q[:,1]-1.17)/.06)**2;mask=np.clip((1-np.minimum(cheek,nose))*2,0,1)
 X=xx[valid];Y=yy[valid];T,B,N=frames(ids,bary);local=tex[Y,X];world=T*local[:,0,None]+B*local[:,1,None]+N*local[:,2,None];world=unit(world+correction[lookup[int(f)]]*mask[:,None]);out=np.stack([np.sum(world*T,axis=1),np.sum(world*B,axis=1),np.sum(world*N,axis=1)],axis=1)
 use=mask>0;result[Y[use],X[use],:3]=np.clip(np.round((out[use]+1)*127.5),0,255).astype('uint8');modified[Y[use],X[use]]=True
stream=io.BytesIO();Image.fromarray(result).save(stream,format='PNG');png=stream.getvalue();binary+=bytes((-len(binary))%4);img['bufferView']=len(j['bufferViews']);img['mimeType']='image/png';j['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(png)});binary+=png;j['buffers'][0]['byteLength']=len(binary);binary+=bytes((-len(binary))%4);js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
out=Path('test-results/olderMale-continuity.glb');out.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary)
report={'sourceSha256':hashlib.sha256(raw).hexdigest(),'faces':len(selection),'edgeConstraints':edgecount,'modifiedTexels':int(modified.sum()),'maxCorrection':float(np.linalg.norm(correction,axis=1).max()),'status':'isolated trial, unreviewed; not installed'};out.with_suffix('.json').write_text(json.dumps(report,indent=2));print(report)

